import aws from 'aws-sdk'
import { AWSService } from '.'

type Constructor = {
  accessKeyId: string
  region: string
  secretAccessKey: string
}

export class AWSSQSService extends AWSService  {
  declare accessKeyId: string
  declare region: string
  declare secretAccessKey: string
  declare sqs: aws.SQS

  constructor ({ accessKeyId, region, secretAccessKey }: Constructor) {
    super({ accessKeyId, region, secretAccessKey })
    this.accessKeyId = accessKeyId
    this.region = region
    this.secretAccessKey = secretAccessKey
    
    this.sqs = new aws.SQS()
  }

  deleteMessage = async (queueUrl: string, receiptHandle: string) => {
    if (receiptHandle) {
      const params = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      }
  
      await this.sqs
        .deleteMessage(params)
        .promise()
        .catch((error: any) => {
          console.error('deleteMessage:sqs.deleteMessage error', error)
        })
    }
  }

  purgeQueue = async (queueUrl: string) => {
    const params = { QueueUrl: queueUrl }
  
    await this.sqs
      .purgeQueue(params)
      .promise()
      .catch((error) => {
        console.error('purgeQueue.sqs.purgeQueue error', error)
      })
  }

  receiveMessageFromQueue = async (queueUrl: string) => {
    const params = {
      QueueUrl: queueUrl,
      MessageAttributeNames: ['All'],
      VisibilityTimeout: 30
    }
  
    const message = await this.sqs
      .receiveMessage(params)
      .promise()
      .then((data) => {
        if (!data.Messages || data.Messages.length === 0) {
          console.log('receiveMessageFromQueue: No messages found.')
          return
        }
        const message = data.Messages[0]
        return message
      })
      .catch((error) => {
        console.error('receiveMessageFromQueue: sqs.receiveMessage error', error)
      })
  
    return message
  }

  sendMessageBatch = (chunkParams: any) => {
    return this.sqs.sendMessageBatch(chunkParams)
  }

  // TODO: replace any
  sendMessageToQueue = async (attrs: any, queueUrl: string) => {
    const message = {
      MessageAttributes: attrs,
      MessageBody: 'aws sqs requires a message body - podverse rules',
      QueueUrl: queueUrl
    }
  
    await this.sqs
      .sendMessage(message)
      .promise()
      .catch((error) => console.error('sendMessageToQueue:sqs.sendMessage', error))
  }  
}
