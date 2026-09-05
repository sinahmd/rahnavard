/**
 * Browser API boundary — one entry point for the typed endpoint modules.
 *
 * Only browser/admin code imports this (or a module under lib/api); RSC
 * data fetching lives in lib/data and never imports here.
 */

export * as auth from './auth'
export * as cars from './cars'
export * as articles from './articles'
export * as branches from './branches'
export * as heroSlides from './heroSlides'
export * as features from './features'
export * as inquiries from './inquiries'
export * as settings from './settings'
export * as stats from './stats'
export { request, ApiRequestError } from './http'
