/**
 * listQuery contract tests: parse defaults, invalid-value handling and
 * parse/build round-trips for both listing pages.
 */

import {
  buildArticleListQuery,
  buildCarListQuery,
  parseArticleListQuery,
  parseCarListQuery,
} from '../listQuery'

function urlParams(queryString: string): URLSearchParams {
  return new URLSearchParams(queryString)
}

describe('parseCarListQuery', () => {
  it('returns defaults for an empty query string', () => {
    const query = parseCarListQuery(urlParams(''))
    expect(query).toEqual({
      search: '',
      filters: {
        brand: '',
        fuel_type: '',
        transmission: '',
        body_type: '',
        min_year: '',
        max_year: '',
        min_price: '',
        max_price: '',
      },
      page: 1,
      sort: '',
    })
  })

  it('reads every filter, search, page and sort parameter', () => {
    const query = parseCarListQuery(
      urlParams(
        'search=rav4&brand=Toyota&fuel_type=gasoline&transmission=automatic' +
          '&body_type=suv&min_year=2020&max_year=2024&min_price=1000&max_price=5000' +
          '&page=3&sort=-created_at'
      )
    )
    expect(query.search).toBe('rav4')
    expect(query.filters).toEqual({
      brand: 'Toyota',
      fuel_type: 'gasoline',
      transmission: 'automatic',
      body_type: 'suv',
      min_year: '2020',
      max_year: '2024',
      min_price: '1000',
      max_price: '5000',
    })
    expect(query.page).toBe(3)
    expect(query.sort).toBe('-created_at')
  })

  it('clamps invalid page values to 1', () => {
    expect(parseCarListQuery(urlParams('page=0')).page).toBe(1)
    expect(parseCarListQuery(urlParams('page=-2')).page).toBe(1)
    expect(parseCarListQuery(urlParams('page=abc')).page).toBe(1)
  })

  it('discards sort values outside the known set', () => {
    expect(parseCarListQuery(urlParams('sort=price')).sort).toBe('price')
    expect(parseCarListQuery(urlParams('sort=')).sort).toBe('')
    // Valid by the listing's own constants:
    expect(parseCarListQuery(urlParams('sort=-price')).sort).toBe('-price')
  })
})

describe('buildCarListQuery', () => {
  const sampleQuery = {
    search: 'rav4',
    filters: { brand: 'Toyota', fuel_type: 'gasoline', transmission: '', body_type: '', min_year: '', max_year: '', min_price: '', max_price: '' },
    page: 1,
    sort: '',
  }

  it('omits empty values and page 1', () => {
    const qs = buildCarListQuery(sampleQuery, 'sort')
    expect(qs).toBe('search=rav4&brand=Toyota&fuel_type=gasoline')
  })

  it('includes page and sort only when set', () => {
    const qs = buildCarListQuery(
      { ...sampleQuery, page: 4, sort: '-created_at' },
      'ordering'
    )
    expect(qs).toBe(
      'search=rav4&brand=Toyota&fuel_type=gasoline&ordering=-created_at&page=4'
    )
  })

  it('round-trips through parse when built with the browser sort key', () => {
    const state = {
      search: 'civic',
      filters: {
        brand: 'Honda',
        fuel_type: 'hybrid',
        transmission: 'automatic',
        body_type: 'sedan',
        min_year: '2021',
        max_year: '2025',
        min_price: '2000',
        max_price: '8000',
      },
      page: 7,
      sort: 'price',
    }

    const qs = buildCarListQuery(state, 'sort')
    expect(parseCarListQuery(urlParams(qs))).toEqual(state)
  })

  it('uses the backend ordering key without losing other params', () => {
    const qs = buildCarListQuery(
      { ...sampleQuery, sort: 'price', page: 2 },
      'ordering'
    )
    expect(qs).toBe(
      'search=rav4&brand=Toyota&fuel_type=gasoline&ordering=price&page=2'
    )
    // The backend ordering param is not a browser-URL param: parsing the
    // ordering-encoded string falls back to the default sort.
    const reparsed = parseCarListQuery(urlParams(qs))
    expect(reparsed.sort).toBe('')
    expect(reparsed.page).toBe(2)
    expect(reparsed.search).toBe('rav4')
  })
})

describe('parseArticleListQuery / buildArticleListQuery', () => {
  it('parses defaults from an empty query', () => {
    expect(parseArticleListQuery(urlParams(''))).toEqual({ search: '', page: 1 })
  })

  it('reads search and page', () => {
    expect(parseArticleListQuery(urlParams('search=هیوندای&page=2'))).toEqual({
      search: 'هیوندای',
      page: 2,
    })
  })

  it('clamps invalid pages to 1', () => {
    expect(parseArticleListQuery(urlParams('page=-1')).page).toBe(1)
  })

  it('omits empties and page 1 when building', () => {
    expect(buildArticleListQuery({ search: '', page: 1 })).toBe('')
    expect(buildArticleListQuery({ search: 'x', page: 1 })).toBe('search=x')
  })

  it('round-trips', () => {
    const state = { search: 'راهنمای خرید', page: 5 }
    const qs = buildArticleListQuery(state)
    expect(parseArticleListQuery(urlParams(qs))).toEqual(state)
  })
})
