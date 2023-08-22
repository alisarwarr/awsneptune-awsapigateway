//AWS-CDK
import * as cdk from '@aws-cdk/core';
//AWS-EC2
import * as ec2 from '@aws-cdk/aws-ec2';
//AWS-LAMBDA
import * as lambda from '@aws-cdk/aws-lambda';
//AWS-APIGATEWAY
import * as apigw from '@aws-cdk/aws-apigateway';
//AWS0-NEPTUNE
import * as neptune from "@aws-cdk/aws-neptune";


export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);



    // creating a VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Ingress',
          subnetType: ec2.SubnetType.ISOLATED,
        }
      ]
    });



    // creating a security group and subnetgroup to ensure lambda and neptune cluster deploy on the same vpc
    const sg1 = new ec2.SecurityGroup(this, "mySecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "security group 1",
      securityGroupName: "mySecurityGroup",
    });
    cdk.Tags.of(sg1).add("Name", "mySecurityGroup");
    sg1.addIngressRule(sg1, ec2.Port.tcp(8182), "MyRule");



    // creating a neptune subnet
    const neptuneSubnet = new neptune.CfnDBSubnetGroup(this, "neptuneSubnetGroup", {
      dbSubnetGroupDescription: "My Subnet",
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.ISOLATED })
        .subnetIds,
      dbSubnetGroupName: "mysubnetgroup",
    });



    // creating neptune cluster
    const neptuneCluster = new neptune.CfnDBCluster(this, "myNeptuneDbCluster", {
      dbSubnetGroupName: neptuneSubnet.dbSubnetGroupName,
      dbClusterIdentifier: "myNeptuneDbCluster",
      vpcSecurityGroupIds: [sg1.securityGroupId],
    });
    neptuneCluster.addDependsOn(neptuneSubnet);



    // Creating neptune instance
    const neptuneInstance = new neptune.CfnDBInstance(this, "myinstance", {
      dbInstanceClass: "db.t3.medium",
      dbClusterIdentifier: neptuneCluster.dbClusterIdentifier,
      availabilityZone: vpc.availabilityZones[0],
    });
    neptuneInstance.addDependsOn(neptuneCluster);



    // creating a lambda function
    const myLambda = new lambda.Function(this, "myLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: new lambda.AssetCode("lambda"),
      handler: "index.handler",
      vpc: vpc,
      securityGroups: [sg1],
      environment: {
        NEPTUNE_ENDPOINT: neptuneCluster.attrEndpoint
      },
      vpcSubnets: {
        subnetType: ec2.SubnetType.ISOLATED
      }
    });



    // display Neptune endpoint
    new cdk.CfnOutput(this, "myNeptuneEndpoint", {
      value: neptuneCluster.attrEndpoint
    })



    // display Apigateway endpoint
    new apigw.LambdaRestApi(this, "myApi", {
      handler: myLambda
    });
  }
}