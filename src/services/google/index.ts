type Constructor = {
  authToken: string
  userAgent: string
}

export class GoogleService  {
  declare authToken: string
  declare userAgent: string

  constructor ({ authToken, userAgent }: Constructor) {
    this.authToken = authToken
    this.userAgent = userAgent
  }
}
