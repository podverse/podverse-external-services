import aws from 'aws-sdk'

type Constructor = {
  accessKeyId: string
  region: string
  secretAccessKey: string
}

export class AWSService  {
  declare accessKeyId: string
  declare region: string
  declare secretAccessKey: string

  constructor ({ accessKeyId, region, secretAccessKey }: Constructor) {
    this.accessKeyId = accessKeyId
    this.region = region
    this.secretAccessKey = secretAccessKey
    
    aws.config.update({
      region: this.region,
      httpOptions: {
        connectTimeout: 5000,
        timeout: 5000
      },
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      }
    })
  }

  s3 = new aws.S3()

  sqs = new aws.SQS()
}
