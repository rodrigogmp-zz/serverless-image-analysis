"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const fs = require("fs");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3();

module.exports.extractMetadata = (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const fileParams = {
    Bucket: bucket,
    Key: key,
  };

  s3.getObject(fileParams, function (err, data) {
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
          console.log(err);
        } else {
          console.log(data);
        }
      });
    }
  });
};

module.exports.getMetadata = async (event, context, callback) => {
  let queryDbParams = {
    TableName: "serverless-defiance-dev",
    Key: {
      s3objectkey: `uploads/${event.pathParameters.s3objectkey}`,
    },
  };

  let imageAttributes = await getImageFromDb(queryDbParams);

  let response = buildResponse(imageAttributes);
  callback(null, response);
};

function getImageFromDb(params) {
  return new Promise((resolve) => {
    dynamoDb.get(params, function (err, data) {
      if (err) console.log(err);
      else {
        resolve(data.Item);
      }
    });
  });
}

function buildResponse(imageAttributes) {
  if (imageAttributes) {
    let responseBody = {
      s3objectkey: imageAttributes.s3objectkey,
      fileLenght: imageAttributes.fileLenght,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } else {
    let responseBody = {
      message: "Image not found",
    };

    return {
      statusCode: 404,
      body: JSON.stringify(responseBody),
    };
  }
}
