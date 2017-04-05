
const index = require( './index.js' );
const data = {
    "CodePipeline.job": {
        id: "Something",
        data: {
            "actionConfiguration": {
                "configuration": {
                    "UserParameters": "fashbae-staging-web"
                }
            },
            "inputArtifacts": [
                {
                    location: {
                        s3Location: {
                            bucketName: 'codepipeline-ap-southeast-2-944528090739',
                            objectKey: 'fashbae-ui-staging/UI-Staging/Oy3mQ6P'
                        }
                    }
                }
            ],
            "artifactCredentials": {
                secretAccessKey: '+rAhgVRRQIubBHG9f+r/mOjoIWngwvJM6uUa7qGN',
                accessKeyId: 'ASIAJZMPMYN2DQKDJ2AQ'
            }
        }
    }
}

index.handler( data, {
    fail: function() {
        console.log( 'Failed' );
    },
    succeed: function() {
        console.log( 'Succeed' );
    }
});
