# A Proven and Comprehensive Pattern for Building an API with Rust and Lambda

Purpose: Supports the article on [Binaryheap.com](https://www.binaryheap.com/api-with-rust-and-lambda/)

### Dependencies

-   Rust
-   Node
-   CDK

### Deploying

Being that this is a CDK project, deploying the API with Rust and Lambda requires running this command from the terminal.

```bash
cdk deploy
```

I've built this with a single stack that'll deploy the Lambdas, DynamoDB Table, and API Gateway.

### Running the API

Once deployed, visit the AWS Console and find the AWS-assigned URL to your new API Gateway.  With that value, you can load Postman and launch the included Postman collection.  It has a variable named `API_ENDPOINT` which is where the assigned URL needs to go.  

My recommendation is you start with the POST endpoint, create some new items, and then explore from there.

### Clean up

The last piece of this is that when you are done, just run `cdk destroy` in the project directory and everything will clean up. 


### Build and dependency checks

Use Node.js 22 or newer, Cargo Lambda locally, or Docker for the bundling fallback. From the repository root run:

```bash
npm ci
npm audit --audit-level=high
npm run build
npm test -- --runInBand
npx cdk synth
```

CDK uses `infra/lib/rust-code.ts` to build each named workspace binary through Cargo Lambda and package its `bootstrap`. Functions run on ARM64 with `provided.al2023`. The infrastructure tests skip real compilation while checking all five functions, API routes, and table grants; bundling tests exercise success, failure, and the Docker fallback with temporary command fixtures. CI checks audit, build, and tests without AWS access. `cdk synth` needs a real compiler/container; `cdk deploy` also needs AWS credentials.

The vulnerable `cargo-lambda-cdk` dependency has been removed and CDK upgraded. As of 2026-11-19, high/critical audit findings are cleared; full audit retains two moderate findings from CDK 2.277.0's bundled minimatch. AWS has [merged its fix](https://github.com/aws/aws-cdk/pull/39595); update CDK and rerun the checks once a patched release is published.
