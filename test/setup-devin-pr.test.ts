import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runSetupDevin } from "../src/setup/devin-setup";

const DOCDRIFT_SETUP_OUTPUT_TAG = "docdrift_setup_output";

vi.mock("../src/devin/v1", () => ({
  devinUploadAttachment: vi.fn().mockResolvedValue("https://example.com/attachment"),
  devinCreateSession: vi.fn().mockResolvedValue({ session_id: "sess-1", url: "https://devin.ai/sess-1" }),
  pollUntilTerminal: vi.fn(),
}));

describe("runSetupDevin", () => {
  let tmpDir: string;
  let envDevinKey: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docdrift-setup-test-"));
    envDevinKey = process.env.DEVIN_API_KEY;
    process.env.DEVIN_API_KEY = "test-key";
  });

  afterEach(() => {
    if (envDevinKey !== undefined) process.env.DEVIN_API_KEY = envDevinKey;
    else delete process.env.DEVIN_API_KEY;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("when openPr and session has PR URL: returns with prUrl and does not write files", async () => {
    const { pollUntilTerminal } = await import("../src/devin/v1");
    const strictBlock = `<${DOCDRIFT_SETUP_OUTPUT_TAG}>{"docdriftYaml":"# test","summary":"Test summary"}</${DOCDRIFT_SETUP_OUTPUT_TAG}>`;
    vi.mocked(pollUntilTerminal).mockResolvedValue({
      session_id: "sess-1",
      status_enum: "finished",
      pull_request: { url: "https://github.com/org/repo/pull/1" },
      messages: [{ role: "assistant", content: strictBlock }],
    } as any);

    const outputPath = path.join(tmpDir, "docdrift.yaml");
    const result = await runSetupDevin({
      cwd: tmpDir,
      outputPath: path.basename(outputPath),
      force: true,
      openPr: true,
    });

    expect(result.prUrl).toBe("https://github.com/org/repo/pull/1");
    expect(result.sessionUrl).toBe("https://devin.ai/sess-1");
    expect(result.summary).toBe("Test summary");
    expect(fs.existsSync(outputPath)).toBe(false);
  });

});
