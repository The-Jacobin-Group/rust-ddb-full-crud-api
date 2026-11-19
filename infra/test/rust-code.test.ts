import assert = require("node:assert/strict");
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App, Stack } from "aws-cdk-lib";
import { Architecture, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Template } from "aws-cdk-lib/assertions";
import { rustCode } from "../lib/rust-code";

function bundle(buildFails: boolean, docker = false): void {
  const root = mkdtempSync(join(tmpdir(), "rust bundle with spaces "));
  const previousPath = process.env.PATH;
  const previousDocker = process.env.CDK_DOCKER;
  try {
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(join(root, "Cargo.toml"), '[package]\nname = "probe"\nversion = "0.1.0"\n');
    const log = join(root, "cargo.json");
    writeFileSync(join(bin, "cargo"), `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(${docker ? 1 : 0});
fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify({args, cwd: process.cwd()}));
if (${buildFails}) process.exit(17);
const output = args[args.indexOf("--lambda-dir") + 1];
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(require("node:path").join(output, "bootstrap"), "test binary");
`, { mode: 0o755 });
    if (docker) {
      process.env.CDK_DOCKER = join(bin, "docker");
      writeFileSync(join(bin, "docker"), `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify({args, cwd: process.cwd()}));
const mount = args.find(arg => arg.includes(":/asset-output"));
const output = mount.split(":/asset-output")[0];
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(require("node:path").join(output, "bootstrap"), "test binary");
`, { mode: 0o755 });
    }
    process.env.PATH = `${bin}:${previousPath ?? ""}`;
    const app = new App({ outdir: join(root, "cdk.out") });
    const stack = new Stack(app, "Test");
    const create = () => new LambdaFunction(stack, "Handler", {
      code: rustCode(root, "probe", Architecture.ARM_64, ["bundle"]),
      runtime: Runtime.PROVIDED_AL2023,
      architecture: Architecture.ARM_64,
      handler: "bootstrap",
    });
    if (buildFails) {
      assert.throws(create, /17|cargo|bundle/i);
      return;
    }
    create();
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "provided.al2023", Architectures: ["arm64"], Handler: "bootstrap",
    });
    const call = JSON.parse(readFileSync(log, "utf8"));
    if (docker) {
      assert.equal(call.args[call.args.indexOf("--entrypoint") + 1], "cargo");
      assert.equal(call.args[call.args.indexOf("-w") + 1], "/asset-input");
      assert.deepEqual(call.args.slice(-12), ["lambda", "build", "--release", "--arm64", "--bin", "probe", "--flatten", "probe", "--features", "bundle", "--lambda-dir", "/asset-output"]);
      return;
    }
    assert.equal(realpathSync(call.cwd), realpathSync(root));
    assert.deepEqual(call.args.slice(0, 9), ["lambda", "build", "--release", "--arm64", "--bin", "probe", "--flatten", "probe", "--features"]);
    assert.equal(call.args[9], "bundle");
    assert.equal(call.args[10], "--lambda-dir");
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    if (previousDocker === undefined) delete process.env.CDK_DOCKER;
    else process.env.CDK_DOCKER = previousDocker;
    rmSync(root, { recursive: true, force: true });
  }
}

test("Cargo Lambda bundles the requested binary/features safely through paths with spaces", () => bundle(false));
test("a failed Cargo build stops asset publication", () => bundle(true));

test("Docker receives the same Cargo Lambda command when local Cargo Lambda is unavailable", () => bundle(false, true));
