"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3();

module.exports.extractMetadata = (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const file_params = {
    Bucket: bucket,
    Key: key,
  };

  console.log("pathParameters " + event.pathParameters);

  s3.getObject(file_params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      const object = {
        TableName: "serverless-defiance-dev",
        Item: {
          s3objectkey: key,
          fileLenght: data.ContentLength,
        },
      };

      dynamoDb.put(object, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data);
        }
      });
    }
  });
};

module.exports.getMetadata = (event, context, callback) => {
  console.log("entrou");
  // console.log("entrou" + s3objectkey);
  // console.log("event" + event);
  // console.log("context" + context);
  // console.log("callback" + callback);
  // console.log("request" + request);
  // console.log("params" + params);
  // try {
  //   return {
  //     statusCode: 200,
  //     body: JSON.stringify({
  //       message: "success",
  //     }),
  //   };
  // } catch (err) {
  //   console.log("error", err);
  // }

  var responseBody = {
    key3: "value3",
    key2: "value2",
    key1: "value1",
  };

  var response = {
    statusCode: 200,
    headers: {
      my_header: "my_value",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
  callback(null, response);
};

module.exports.hello = async (event, context, callback) => {
  console.log("entrou");
  return {
    statusCode: 204,
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
