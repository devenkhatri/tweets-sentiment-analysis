import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { ComprehendClient } from "@aws-sdk/client-comprehend";

const REGION = "us-east-1";
//const IDENTITY_POOL_ID = "us-east-1:ede7c726-b84b-4177-bf59-05e21535bd65"; // An Amazon Cognito Identity Pool ID.

// Create an Amazon Rekognition service client object.
const comprehendClient = (IDENTITY_POOL_ID) => {
 return new ComprehendClient({
    region: REGION,
    credentials: fromCognitoIdentityPool({
      client: new CognitoIdentityClient({ region: REGION }),
      identityPoolId: IDENTITY_POOL_ID,
    }),
  })
}

export { comprehendClient };
