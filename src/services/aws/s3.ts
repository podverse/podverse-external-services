import aws from 'aws-sdk'
import { AWSService } from '.'

type Constructor = {
  accessKeyId: string
  region: string
  secretAccessKey: string
}

export class AWSS3Service extends AWSService  {
  declare accessKeyId: string
  declare region: string
  declare secretAccessKey: string
  declare s3: aws.S3

  constructor ({ accessKeyId, region, secretAccessKey }: Constructor) {
    super({ accessKeyId, region, secretAccessKey })
    this.accessKeyId = accessKeyId
    this.region = region
    this.secretAccessKey = secretAccessKey
    
    this.s3 = new aws.S3()
  }
}
