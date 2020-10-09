"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const fs = require("fs");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3();

const gm = require("gm").subClass({ imageMagick: true });

// const { loadImage, resizeImage } = require("serverless-image-resizer");

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

module.exports.listImages = async (event, context, callback) => {

  const scanningParameters = {
    TableName: "serverless-defiance-dev",
  }

  const data = await getAllImages(scanningParameters)
  if (data.Count > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(data.Items)
    }
  }
  else {
    return {
      statusCode: 204,
    };
  }
};

module.exports.biggestImage = async (event, context, callback) => {
  const scanningParameters = {
    TableName: "serverless-defiance-dev",
  }

  const data = await getAllImages(scanningParameters)

  let biggest = data.Items[0]
  let i = 0

  for (i = 1; i < data.Count; i++) {
    console.log(data.Items[i].s3objectkey, data.Items[i].fileLenght)
    if (data.Items[i].fileLenght > biggest.fileLenght) biggest = data.Items[i];
  }

  if (data.Count > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(biggest)
    }
  }
  else {
    return {
      statusCode: 204,
    };
  }
};

module.exports.smallestImage = async (event, context, callback) => {
  const scanningParameters = {
    TableName: "serverless-defiance-dev",
  }

  const data = await getAllImages(scanningParameters)

  let smallest = data.Items[0]
  let i = 0

  for (i = 1; i < data.Count; i++) {
    console.log(data.Items[i].s3objectkey, data.Items[i].fileLenght)
    if (data.Items[i].fileLenght < smallest.fileLenght) smallest = data.Items[i];
  }

  if (data.Count > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(smallest)
    }
  }
  else {
    return {
      statusCode: 204,
    };
  }
};

function getAllImages(scanningParameters) {
  return new Promise((resolve) => {
    dynamoDb.scan(scanningParameters, function(err, data) {
      if(err) callback(err, null)
      else {
        resolve(data)
      }
    })
  })
}

module.exports.downloadImage = async (event, context, callback) => {
  let queryDbParams = {
    TableName: "serverless-defiance-dev",
    Key: {
      s3objectkey: `uploads/${event.pathParameters.s3objectkey}`,
    },
  };

  let imageAttributes = await getImageFromDb(queryDbParams);

  console.log(imageAttributes)
  // console.log(imageAttributes)

  const fileParams = {
    Bucket: "serverless-defiance",
    Key: `uploads/${event.pathParameters.s3objectkey}`,
  };

  file = await getFileFromS3(fileParams)

  if file
    
};

function getFileFromS3(fileParams) {
  return new Promise ((resolve) => {
    s3.getObject(fileParams, function (err, data) {
      if (err) {
        console.log(err);
      } else { resolve(data) }
    })
  })
}

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
