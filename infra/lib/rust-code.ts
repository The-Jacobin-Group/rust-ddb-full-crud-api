import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { AssetHashType, DockerImage } from "aws-cdk-lib";
import { Architecture, Code } from "aws-cdk-lib/aws-lambda";

/** Bundle with Cargo Lambda directly, avoiding a second Cargo.toml parser in Node. */
export function rustCode(
  sourceDir: string,
  binaryName: string,
  architecture: Architecture,
  features: string[] = [],
): Code {
  const args = [
    "lambda", "build", "--release",
    architecture.name === "arm64" ? "--arm64" : "--x86-64",
    "--bin", binaryName, "--flatten", binaryName,
    ...(features.length ? ["--features", features.join(",")] : []),
  ];
  return Code.fromAsset(resolve(sourceDir), {
    exclude: [".git", "node_modules", "infra/node_modules", "target", "cdk.out", "infra/cdk.out"],
    assetHashType: AssetHashType.OUTPUT,
    bundling: {
      image: DockerImage.fromRegistry("ghcr.io/cargo-lambda/cargo-lambda"),
      entrypoint: ["cargo"],
      command: [...args, "--lambda-dir", "/asset-output"],
      workingDirectory: "/asset-input",
      local: {
        tryBundle(outputDir: string): boolean {
          const available = spawnSync("cargo", ["lambda", "--version"], { stdio: "ignore", env: process.env });
          if (available.error || available.status !== 0) return false;
          execFileSync("cargo", [...args, "--lambda-dir", outputDir], {
            cwd: resolve(sourceDir), stdio: "inherit", env: process.env,
          });
          return true;
        },
      },
    },
  });
}
