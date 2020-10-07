"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.extractMetadata = (event, context, callback) => {
  console.log("entrou");
  var params = {
    TableName: "serverless-defiance-dev",
    Item: {
      s3objectkey: "1",
      firstAttribute: "5",
    },
  };

  dynamoDb.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });

  console.log("passou da inserção no banco");
};

module.exports.getMetadata = (event, context, callback) => {};
