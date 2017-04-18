
const AWS = require( 'aws-sdk' );
const fs = require( 'fs' );
const mimeTypes = require( 'mime-types' );
const unzip = require( 'unzipper' );

function handler( event, context ) {
    console.log( 'Starting job...' );
    var codepipeline = new AWS.CodePipeline();

    // Retrieve the Job ID from the Lambda action
    var job = event["CodePipeline.job"];
    var jobId = job.id;

    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
    // health checked by this function.
    var destinationBucket = job.data.actionConfiguration.configuration.UserParameters;

    var inputArtifact = job.data.inputArtifacts[ 0 ].location.s3Location;

    var artifactCredentials = job.data.artifactCredentials;

    console.log( 'Destination Bucket: ', destinationBucket );
    console.log( 'Input Artifact: ', inputArtifact );
    console.log( 'Credentials: ', artifactCredentials );

    var s3 = new AWS.S3({
        maxRetries: 10,
        signatureVersion: 'v4',
        // accessKeyId: artifactCredentials.accessKeyId,
        // sessionToken: artifactCredentials.sessionToken,
        // secretAccessKey: artifactCredentials.secretAccessKey
    });

    // Notify AWS CodePipeline of a successful job
    var putJobSuccess = (message) => {
        var params = {
            jobId: jobId
        };
        codepipeline.putJobSuccessResult(params, function(err, data) {
            if(err) {
                context.fail(err);
            } else {
                context.succeed(message);
            }
        });
    };

    // Notify AWS CodePipeline of a failed job
    var putJobFailure = (message) => {
        var params = {
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        };
        codepipeline.putJobFailureResult(params, function(err, data) {
            context.fail(message);
        });
    };

    function getDownloadStream( bucket, key ) {
        return s3
                .getObject( {
                    Bucket: bucket,
                    Key: key
                } )
                .on( 'error', ( error ) => {
                    return Promise.reject( `S3 Download Error: ${error}` );
                } )
                .createReadStream();
    }

    // Download S3 build file
    if (!fs.existsSync('/tmp/build')){
        fs.mkdirSync('/tmp/build');
    }
    var files = [];
    getDownloadStream( inputArtifact.bucketName, inputArtifact.objectKey )
        .pipe(unzip.Parse())
        .on('entry', function (entry) {
            var fileName = entry.path;
            var type = entry.type; // 'Directory' or 'File'
            var size = entry.size;

            files.push(fileName);
            entry.pipe( fs.createWriteStream('/tmp/build/' + fileName) );
        })
        .promise()
        .then(() => {
            // push to s3 each file
            var promises = files.map( ( file ) => {
                const contentType = mimeTypes.lookup( file );
                console.log(`file: ${file}`)
                const options = {
                  Bucket: destinationBucket,
                  Key: file,
                  Body: fs.readFileSync(`/tmp/build/${file}`),
                  ContentType: contentType || 'application/octet-stream',
                  CacheControl: file !== 'index.html' ?
                    // 'max-age=604800' : 'max-age=0, public, must-revalidate, proxy-revalidate'
                    'max-age=604800' : 'max-age=1800, must-revalidate, proxy-revalidate'
                };
                return s3.putObject(options).promise();
            });
            return Promise.all( promises );
        })
        .then( () => {
            console.log( 'Upload finished' );
            putJobSuccess( 'Success Upload to ' + destinationBucket );
        })
        .catch( ( err ) => {
            console.log( err );
            putJobFailure(err);
        });

}

module.exports = {
    handler: handler
}
