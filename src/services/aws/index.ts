import aws from 'aws-sdk'

type Constructor = {
  key: string
  region: string
}

export class AWSService  {
  declare key: string
  declare region: string

  constructor ({ region }: Constructor) {
    this.region = region
    
    aws.config.update({
      region: this.region,
      httpOptions: {
        connectTimeout: 5000,
        timeout: 5000
      }
    })
  }

  s3 = new aws.S3()

  sqs = new aws.SQS()
}
