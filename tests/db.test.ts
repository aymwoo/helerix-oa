import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset fetch mock before each test
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

// Helper to mock fetch responses
const mockFetch = (data: any, ok = true, status = 200) => {
  return vi.mocked(global.fetch).mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response);
};

import {
  UserDatabase,
  CertificateDatabase,
  PromptDatabase,
  EventsDatabase,
  FileManager,
  DatabaseManager,
  CriticDatabase,
  EventTypeDatabase,
  ExamAnalysisDatabase,
} from "../db";

describe("API Client - UserDatabase", () => {
  const mockUsers = [
    {
      id: "user-1",
      name: "测试用户",
      email: "test@example.com",
      roles: ["数学教研员"],
    },
  ];

  it("should fetch all users", async () => {
    mockFetch(mockUsers);

    const users = await UserDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
    expect(users).toEqual(mockUsers);
  });

  it("should fetch user by id", async () => {
    mockFetch(mockUsers[0]);

    const user = await UserDatabase.getById("user-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users/user-1",
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
    expect(user?.name).toBe("测试用户");
  });

  it("should return null for non-existent user", async () => {
    mockFetch({}, false, 404);

    const user = await UserDatabase.getById("non-existent");

    expect(user).toBeNull();
  });

  it("should add new user", async () => {
    const newUser = {
      id: "user-2",
      name: "新用户",
      email: "new@test.com",
      roles: [],
    };
    mockFetch(newUser); // POST response
    mockFetch([...mockUsers, newUser]); // getAll response

    await UserDatabase.add(newUser as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(newUser),
      }),
    );
  });

  it("should update user", async () => {
    const updated = { ...mockUsers[0], name: "更新后" };
    mockFetch({ success: true }); // PUT response
    mockFetch([updated]); // getAll response

    await UserDatabase.update(updated as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users/user-1",
      expect.objectContaining({
        method: "PUT",
      }),
    );
  });

  it("should delete user", async () => {
    mockFetch({ success: true }); // DELETE response
    mockFetch([]); // getAll response

    await UserDatabase.delete("user-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users/user-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("API Client - CertificateDatabase", () => {
  const mockCerts = [
    {
      id: "cert-1",
      name: "优秀教师奖",
      issuer: "省教育厅",
      timestamp: Date.now(),
    },
  ];

  it("should fetch all certificates", async () => {
    mockFetch(mockCerts);

    const certs = await CertificateDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/certificates",
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
    expect(certs).toEqual(mockCerts);
  });

  it("should fetch certificate by id", async () => {
    mockFetch(mockCerts[0]);

    const cert = await CertificateDatabase.getById("cert-1");

    expect(cert?.name).toBe("优秀教师奖");
  });

  it("should add certificate", async () => {
    const newCert = { id: "cert-2", name: "新证书", timestamp: Date.now() };
    mockFetch(newCert);
    mockFetch([...mockCerts, newCert]);

    await CertificateDatabase.add(newCert as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/certificates",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should delete certificate", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await CertificateDatabase.delete("cert-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/certificates/cert-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("API Client - PromptDatabase", () => {
  const mockPrompts = [
    { id: "prompt-1", name: "默认提示", category: "exam", isDefault: true },
  ];

  it("should fetch all prompts", async () => {
    mockFetch(mockPrompts);

    const prompts = await PromptDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith("/api/prompts");
  });

  it("should fetch prompts by category", async () => {
    mockFetch(mockPrompts.filter((p) => p.category === "exam"));

    await PromptDatabase.getAll("exam");

    expect(global.fetch).toHaveBeenCalledWith("/api/prompts?category=exam");
  });

  it("should add prompt", async () => {
    const newPrompt = {
      id: "prompt-2",
      name: "新提示",
      category: "certificate",
    };
    mockFetch(newPrompt);
    mockFetch([newPrompt]);

    await PromptDatabase.add(newPrompt as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/prompts",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should delete prompt", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await PromptDatabase.delete("prompt-1", "exam");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/prompts/prompt-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("API Client - EventsDatabase", () => {
  const mockEvents = [{ id: "event-1", title: "会议", date: "2024-01-15" }];

  it("should fetch all events", async () => {
    mockFetch(mockEvents);

    const events = await EventsDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith("/api/events");
    expect(events).toEqual(mockEvents);
  });

  it("should add event", async () => {
    const newEvent = { id: "event-2", title: "新会议" };
    mockFetch(newEvent);
    mockFetch([...mockEvents, newEvent]);

    await EventsDatabase.add(newEvent as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should delete event", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await EventsDatabase.delete("event-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/events/event-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("API Client - CriticDatabase", () => {
  const mockSessions = [{ id: "session-1", title: "会话", messages: [] }];

  it("should fetch all sessions", async () => {
    mockFetch(mockSessions);

    const sessions = await CriticDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/critic-sessions",
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
  });

  it("should add or update session", async () => {
    const session = {
      id: "session-2",
      title: "新会话",
      messages: [],
      timestamp: Date.now(),
    };
    mockFetch(session);
    mockFetch([session]);

    await CriticDatabase.addOrUpdate(session as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/critic-sessions",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should delete session", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await CriticDatabase.delete("session-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/critic-sessions/session-1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.any(Object),
      }),
    );
  });
});

describe("API Client - EventTypeDatabase", () => {
  it("should fetch all event types", async () => {
    mockFetch([{ id: "et-1", name: "会议", colorClass: "bg-blue-500" }]);

    await EventTypeDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith("/api/event-types");
  });

  it("should add event type", async () => {
    mockFetch({ id: "et-2", name: "培训", colorClass: "bg-green-500" });
    mockFetch([]);

    await EventTypeDatabase.add("培训", "bg-green-500");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/event-types",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "培训", colorClass: "bg-green-500" }),
      }),
    );
  });

  it("should delete event type", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await EventTypeDatabase.delete("et-1");

    expect(global.fetch).toHaveBeenCalledWith("/api/event-types/et-1", {
      method: "DELETE",
    });
  });
});

describe("API Client - ExamAnalysisDatabase", () => {
  const mockAnalysis = {
    id: "analysis-1",
    title: "期末",
    subject: "数学",
    knowledgePoints: [],
    itemAnalysis: [],
  };

  it("should fetch all analyses", async () => {
    mockFetch([mockAnalysis]);

    await ExamAnalysisDatabase.getAll();

    expect(global.fetch).toHaveBeenCalledWith("/api/exam-analyses");
  });

  it("should add analysis", async () => {
    mockFetch(mockAnalysis);
    mockFetch([mockAnalysis]);

    await ExamAnalysisDatabase.add(mockAnalysis as any);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/exam-analyses",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should delete analysis", async () => {
    mockFetch({ success: true });
    mockFetch([]);

    await ExamAnalysisDatabase.delete("analysis-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/exam-analyses/analysis-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("API Client - FileManager", () => {
  it("should upload file", async () => {
    mockFetch({ uri: "file://new-file-id" });

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const uri = await FileManager.saveFile(mockFile);

    // Wait for FileReader
    await new Promise((r) => setTimeout(r, 10));

    expect(uri).toContain("file://");
  });

  it("should get file by URI", async () => {
    const mockFile = {
      id: "file-1",
      name: "test.png",
      mimeType: "image/png",
      data: "base64",
    };
    mockFetch(mockFile);

    const file = await FileManager.getFile("file://file-1");

    expect(global.fetch).toHaveBeenCalledWith("/api/files/file-1");
    expect(file?.name).toBe("test.png");
  });

  it("should return null for invalid URI", async () => {
    const file = await FileManager.getFile("https://example.com/file");
    expect(file).toBeNull();
  });

  it("should resolve file to data URL", async () => {
    const mockFile = {
      id: "file-1",
      name: "test.png",
      mimeType: "image/png",
      data: "base64data",
    };
    mockFetch(mockFile);

    const dataUrl = await FileManager.resolveToDataUrl("file://file-1");

    expect(dataUrl).toBe("data:image/png;base64,base64data");
  });

  it("should delete file", async () => {
    mockFetch({ success: true });

    await FileManager.deleteFile("file://file-1");

    expect(global.fetch).toHaveBeenCalledWith("/api/files/file-1", {
      method: "DELETE",
    });
  });
});

describe("API Client - DatabaseManager", () => {
  it("should export database", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response);

    const data = await DatabaseManager.exportDatabase();

    expect(global.fetch).toHaveBeenCalledWith("/api/database/export");
    expect(data).toBeInstanceOf(Uint8Array);
  });

  it("should warn on import attempt", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await DatabaseManager.importDatabase(new Uint8Array());

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Database import is not supported in API mode",
    );

    consoleSpy.mockRestore();
  });
});
