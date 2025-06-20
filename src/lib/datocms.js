import { executeQuery as libExecuteQuery } from '@datocms/cda-client'
import { DATOCMS_API_KEY } from 'astro:env/server'
console.log('DATOCMS_API_KEY:', DATOCMS_API_KEY)

export async function executeQuery(query, options) {
  return await libExecuteQuery(query, {
    ...options,
    token: DATOCMS_API_KEY,
  })
}
