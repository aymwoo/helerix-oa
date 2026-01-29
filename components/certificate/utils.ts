import { HonorLevel, CertificateCategory, Certificate } from "../../types";
import React from "react";

export const parseLevel = (levelStr: string): HonorLevel => {
  const normalizedLevel = levelStr.toLowerCase();
  if (normalizedLevel.includes("国家") || normalizedLevel.includes("national"))
    return HonorLevel.National;
  if (normalizedLevel.includes("省") || normalizedLevel.includes("provincial"))
    return HonorLevel.Provincial;
  if (normalizedLevel.includes("市") || normalizedLevel.includes("municipal"))
    return HonorLevel.Municipal;
  if (
    normalizedLevel.includes("区") ||
    normalizedLevel.includes("县") ||
    normalizedLevel.includes("district")
  )
    return HonorLevel.District;
  if (normalizedLevel.includes("校") || normalizedLevel.includes("school"))
    return HonorLevel.School;
  return HonorLevel.Municipal;
};

export const parseCategory = (categoryStr: string): CertificateCategory => {
  const normalizedCat = categoryStr.toLowerCase();
  if (
    normalizedCat.includes("荣誉") ||
    normalizedCat.includes("表彰") ||
    normalizedCat.includes("award")
  )
    return CertificateCategory.Award;
  if (normalizedCat.includes("课题") || normalizedCat.includes("project"))
    return CertificateCategory.Project;
  if (normalizedCat.includes("培训") || normalizedCat.includes("training"))
    return CertificateCategory.Training;
  if (
    normalizedCat.includes("职称") ||
    normalizedCat.includes("资格") ||
    normalizedCat.includes("qualification")
  )
    return CertificateCategory.Qualification;
  return CertificateCategory.Other;
};

export const getLevelColor = (level: HonorLevel) => {
  switch (level) {
    case HonorLevel.National:
      return "bg-amber-100 text-amber-700 border-amber-200";
    case HonorLevel.Provincial:
      return "bg-purple-100 text-purple-700 border-purple-200";
    case HonorLevel.Municipal:
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};
