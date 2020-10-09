"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3();

const TableName = "serverless-defiance-dev"

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
        TableName: TableName,
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
    TableName: TableName,
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
    TableName: TableName,
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

module.exports.infoImages = async (event, context, callback) => {
  const scanningParameters = {
    TableName: TableName,
  }

  const data = await getAllImages(scanningParameters)

  let {smallest, biggest} = getSmallestAndBiggestImages(data)

  let {jpgAmount, bmpAmount, gifAmount, pngAmount, existingImageFormats} = calculateFormatAmount(data)

  let responseBody = {
    smallestImage: smallest,
    biggestImage: biggest,
    jpgAmount: jpgAmount,
    bmpAmount: bmpAmount,
    gifAmount: gifAmount,
    pngAmount: pngAmount,
    allowedImageFormats: [".jpg", ".bmp", ".gif", ".png"],
    existingImageFormats: existingImageFormats
  }

  if (data.Count > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(responseBody)
    }
  }
  else {
    return {
      statusCode: 204,
    };
  }
};

function calculateFormatAmount(data) {
  let response = {
    jpgAmount: 0,
    bmpAmount: 0,
    gifAmount: 0,
    pngAmount: 0,
    existingImageFormats: []
  }

  for (let i = 0; i < data.Count; i++) {
    if (data.Items[i].s3objectkey.includes(".jpg")) response.jpgAmount ++
    if (data.Items[i].s3objectkey.includes(".bmp")) response.bmpAmount ++
    if (data.Items[i].s3objectkey.includes(".gif")) response.gifAmount ++
    if (data.Items[i].s3objectkey.includes(".png")) response.pngAmount ++
  }

  if (response.jpgAmount > 0) response.existingImageFormats.push(".jpg")
  if (response.bmpAmount > 0) response.existingImageFormats.push(".bmp")
  if (response.gifAmount > 0) response.existingImageFormats.push(".gif")
  if (response.pngAmount > 0) response.existingImageFormats.push(".png")

  return response

}

function getSmallestAndBiggestImages(data) {
  let smallest = data.Items[0]
  let biggest = data.Items[0]
  let i = 0

  for (i = 1; i < data.Count; i++) {
    if (data.Items[i].fileLenght < smallest.fileLenght) smallest = data.Items[i];
    if (data.Items[i].fileLenght > biggest.fileLenght) biggest = data.Items[i];
  }

  return {
    smallest: smallest,
    biggest: biggest
  }
}

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
    TableName: TableName,
    Key: {
      s3objectkey: `uploads/${event.pathParameters.s3objectkey}`,
    },
  };

  let imageAttributes = await getImageFromDb(queryDbParams);

  if (imageAttributes) { 

    const fileParams = {
      Bucket: "serverless-defiance",
      Key: `uploads/${event.pathParameters.s3objectkey}`,
    };

    let file = await getFileFromS3(fileParams)
    
    return {
      statusCode: 200,
      body: JSON.stringify(file.Body.toString("base64")),
    };
    
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({message :"Image not found"})
    };
  }

    
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
