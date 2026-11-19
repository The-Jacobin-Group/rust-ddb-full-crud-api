import { Construct } from "constructs";
import { FunctionProps } from "../data-interaces/function-props";
import { rustCode } from "../rust-code";
import { join } from "node:path";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Architecture, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";

export class PostFunctionConstruct extends Construct {
    constructor(scope: Construct, id: string, props: FunctionProps) {
        super(scope, id);

        const func = new LambdaFunction(scope, 'PostFunction', {
            functionName: 'sample-post',
            runtime: Runtime.PROVIDED_AL2023,
            handler: "bootstrap",
            code: rustCode(join(__dirname, "../../.."), "post", Architecture.ARM_64),
            memorySize: 256,
            architecture: Architecture.ARM_64,
            environment: {
                "TABLE_NAME": props.table.tableName
            }
        })

        props.resource
            .addMethod('POST', new LambdaIntegration(
                func, {
                proxy: true
            }));

        props.table.grantWriteData(func);
    }
}