import { useState } from "react";
import { Certificate, User } from "../types";
import { FileManager } from "../db";
import { useToast } from "../components/ToastContext";

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const useCertificateExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { success, error, warning } = useToast();

  const performExport = async (
    certsToExport: Certificate[],
    allUsers: User[],
    currentUser: User | null,
    filenamePrefix: string = "证书统计导出",
    onComplete?: () => void,
  ) => {
    if (certsToExport.length === 0) {
      warning("没有符合条件的记录可导出");
      return;
    }

    setIsExporting(true);

    try {
      // Dynamic imports
      const XLSX = await import("xlsx");
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");

      const zip = new JSZip();
      const dateStr = new Date().toISOString().split("T")[0];
      const folderName = `${filenamePrefix}_${dateStr}`;
      const imgFolder = zip.folder(folderName + "/images");

      // Generate Excel Data
      const data = certsToExport.map((c) => {
        const owner = allUsers.find((u) => u.id === c.userId);
        return {
          证书名称: c.name,
          颁发单位: c.issuer,
          级别: c.level,
          类别: c.category,
          取得日期: c.issueDate,
          学时: c.hours || 0,
          添加日期: formatDate(c.timestamp),
          所属用户: owner
            ? owner.name
            : c.userId === currentUser?.id
              ? currentUser?.name
              : "未知用户",
          图片文件名: "",
        };
      });

      const usedFilenames = new Set<string>();

      await Promise.all(
        certsToExport.map(async (c, index) => {
          if (!c.credentialUrl) return;

          try {
            let blob: Blob | null = null;
            let extension = "jpg";

            if (c.credentialUrl.startsWith("file://")) {
              const fileData = await FileManager.getFile(c.credentialUrl);
              if (fileData) {
                const byteCharacters = atob(fileData.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: fileData.mimeType });
                if (fileData.mimeType === "application/pdf") extension = "pdf";
                else if (fileData.mimeType === "image/png") extension = "png";
                else if (fileData.mimeType === "image/jpeg") extension = "jpg";
              }
            } else {
              const res = await fetch(c.credentialUrl);
              if (res.ok) {
                blob = await res.blob();
                const mimeType = blob.type;
                if (mimeType === "application/pdf") extension = "pdf";
                else if (mimeType === "image/png") extension = "png";
                else if (mimeType === "image/jpeg") extension = "jpg";
              }
            }

            if (blob && imgFolder) {
              const safeName = c.name.replace(/[\\/:*?"<>|]/g, "_");
              const dateStrClean = c.issueDate.replace(/-/g, "");
              let filename = `${dateStrClean}_${safeName}.${extension}`;

              let counter = 1;
              while (usedFilenames.has(filename)) {
                filename = `${dateStrClean}_${safeName}_${counter}.${extension}`;
                counter++;
              }
              usedFilenames.add(filename);

              imgFolder.file(filename, blob);
              data[index]["图片文件名"] = filename;
            }
          } catch (err) {
            console.error(
              `Failed to process image for certificate ${c.name}`,
              err,
            );
          }
        }),
      );

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "证书统计");

      // Auto-width columns
      const maxWidth = data.reduce(
        (w, r) => Math.max(w, r["证书名称"].length),
        10,
      );
      worksheet["!cols"] = [
        { wch: maxWidth + 5 }, // Name
        { wch: 20 }, // Issuer
        { wch: 10 }, // Level
        { wch: 10 }, // Category
        { wch: 12 }, // Date
        { wch: 8 }, // Hours
        { wch: 12 }, // Add Date
        { wch: 15 }, // User
        { wch: 30 }, // Image Filename
      ];

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      zip.file(`${folderName}/证书统计表.xlsx`, excelBuffer);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
      success(`成功导出 ${certsToExport.length} 条记录及相应附件`);
    } catch (err) {
      console.error("Failed to generate zip", err);
      error("导出压缩包失败");
    } finally {
      setIsExporting(false);
      if (onComplete) onComplete();
    }
  };

  return {
    isExporting,
    performExport,
  };
};
