/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */

declare module "sst" {
  export interface Resource {
    "E": {
      "type": "sst.aws.Vpc"
    }
    "SvelteAIChat": {
      "type": "sst.aws.SvelteKit"
      "url": string
    }
    "SvelteAIPostgres": {
      "database": string
      "host": string
      "password": string
      "port": number
      "type": "sst.aws.Postgres"
      "username": string
    }
    "Zero": {
      "service": string
      "type": "sst.aws.Service"
      "url": string
    }
  }
}
/// <reference path="sst-env.d.ts" />

import "sst"
export {}