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

module.exports.getMetadata = async (event, context, callback) => {
  let params = {
    TableName: "serverless-defiance-dev",
    Key: {
      s3objectkey: `uploads/${event.pathParameters.s3objectkey}`,
    },
  };

  function getImageFromDb() {
    return new Promise((resolve) => {
      dynamoDb.get(params, function (err, data) {
        if (err) console.log(err);
        else {
          resolve(data.Item);
        }
      });
    });
  }

  let imageAttributes = await getImageFromDb();

  if (imageAttributes) {
    let responseBody = {
      s3objectkey: imageAttributes.s3objectkey,
      fileLenght: imageAttributes.fileLenght,
    };

    let response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
    callback(null, response);
  } else {
    let responseBody = {
      message: "Image not found",
    };

    let response = {
      statusCode: 404,
      body: JSON.stringify(responseBody),
    };
    callback(null, response);
  }
};
