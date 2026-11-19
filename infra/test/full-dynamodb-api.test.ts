import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FullDynamodbApiStack } from "../lib/full-dynamodb-api-stack";

test("all CRUD functions keep ARM64, the supported runtime, API routes, and table access", () => {
  const app = new App({ context: { "aws:cdk:bundling-stacks": [] } });
  const template = Template.fromStack(new FullDynamodbApiStack(app, "Test"));
  template.resourceCountIs("AWS::Lambda::Function", 5);
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
  const functions = Object.values(template.findResources("AWS::Lambda::Function"));
  for (const resource of functions) {
    expect(resource.Properties).toMatchObject({
      Runtime: "provided.al2023", Architectures: ["arm64"], Handler: "bootstrap",
      Environment: { Variables: { TABLE_NAME: expect.anything() } },
    });
  }
  const methods = Object.values(template.findResources("AWS::ApiGateway::Method"));
  expect(methods.map(resource => resource.Properties.HttpMethod).sort()).toEqual(["DELETE", "GET", "GET", "POST", "PUT"]);
  template.resourceCountIs("AWS::IAM::Policy", 5);
});
