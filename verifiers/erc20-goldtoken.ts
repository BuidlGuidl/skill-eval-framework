import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AssertionStatus, Verifier } from "../lib/types";

const MINUTE_MS = 60_000;

const changedFiles = (workspacePath: string) => {
  const status = execFileSync("git", ["-C", workspacePath, "status", "--porcelain", "-uall"], {
    encoding: "utf8",
  });

  return status
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const entry = line.slice(3);
      const renameArrow = entry.indexOf(" -> ");

      return renameArrow === -1 ? entry : entry.slice(renameArrow + 4);
    });
};

const toStatus = (passed: boolean): AssertionStatus => (passed ? "pass" : "fail");

const verify: Verifier = async workspacePath => {
  const files = changedFiles(workspacePath).filter(file => existsSync(path.join(workspacePath, file)));
  const readWorkspaceFile = (file: string) => readFileSync(path.join(workspacePath, file), "utf8");

  const tokenContracts = files
    .filter(file => file.startsWith("packages/hardhat/contracts/") && file.endsWith(".sol"))
    .map(file => ({ file, content: readWorkspaceFile(file) }))
    .filter(({ content }) => content.includes("ERC20"));

  // Wildcard `import "@openzeppelin/..."` fails under OZ v5; the skill's named-imports
  // guidance was the +100pp assertion from the iteration-6 re-eval.
  const ozImports = tokenContracts.flatMap(({ content }) =>
    [...content.matchAll(/import\s+([^;]*?)"@openzeppelin\/[^"]+"/g)].map(match => match[1]),
  );
  const namedImports = ozImports.length > 0 && ozImports.every(clause => clause.includes("{"));

  const updateOverride = tokenContracts.some(({ content }) => /function\s+_update\s*\(/.test(content));
  const erc20Capped = tokenContracts.some(({ content }) => content.includes("ERC20Capped"));

  const deployScript = files.some(
    file => file.startsWith("packages/hardhat/deploy/") && (file.endsWith(".ts") || file.endsWith(".js")),
  );

  const uiPages = files
    .filter(file => file.startsWith("packages/nextjs/") && (file.endsWith(".tsx") || file.endsWith(".ts")))
    .map(readWorkspaceFile);
  const mintTransferUi =
    uiPages.some(content => content.includes("useScaffoldWriteContract")) &&
    uiPages.some(content => /mint/i.test(content)) &&
    uiPages.some(content => /transfer/i.test(content));

  // Compile only when there is a token contract to judge; a pristine workspace compiling
  // says nothing about the run.
  let compiles = false;

  if (tokenContracts.length > 0) {
    const hardhatDir = path.join(workspacePath, "packages", "hardhat");

    const yarnOptions = { stdio: "pipe", timeout: 10 * MINUTE_MS, maxBuffer: 64 * 1024 * 1024 } as const;

    if (!existsSync(path.join(workspacePath, "node_modules"))) {
      execFileSync("yarn", ["install"], { ...yarnOptions, cwd: workspacePath });
    }

    try {
      execFileSync("yarn", ["compile"], { ...yarnOptions, cwd: hardhatDir });
      compiles = true;
    } catch {
      compiles = false;
    }
  }

  return {
    assertions: {
      named_imports: toStatus(namedImports),
      update_override: toStatus(updateOverride),
      erc20_capped: toStatus(erc20Capped),
      compiles: toStatus(compiles),
      deploy_script: toStatus(deployScript),
      mint_transfer_ui: toStatus(mintTransferUi),
    },
  };
};

export default verify;
