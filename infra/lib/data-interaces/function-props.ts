import {IResource, RestApi} from "aws-cdk-lib/aws-apigateway";
import {ITable} from "aws-cdk-lib/aws-dynamodb";

export interface FunctionProps {
    api: RestApi;
    resource: IResource
    table: ITable
}