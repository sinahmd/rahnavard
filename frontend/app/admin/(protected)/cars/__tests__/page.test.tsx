import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import AdminCarsPage from '../page'
import {
  deleteCar,
  listCars,
  restoreCar,
  setCarActive,
  setCarFeatured,
} from '@/lib/api/cars'
import type { CarAdmin } from '@/types/car'

jest.mock('@/lib/api/cars')

const mockListCars = listCars as jest.MockedFunction<typeof listCars>
const mockSetCarActive = setCarActive as jest.MockedFunction<typeof setCarActive>
const mockSetCarFeatured = setCarFeatured as jest.MockedFunction<typeof setCarFeatured>
const mockDeleteCar = deleteCar as jest.MockedFunction<typeof deleteCar>
const mockRestoreCar = restoreCar as jest.MockedFunction<typeof restoreCar>

const car: CarAdmin = {
  id: 1,
  brand: 'kia',
  model: 'k5',
  persian_name: 'کیا ک5',
  slug: 'kia-k5',
  description: '',
  year: 2024,
  fuel_type: 'gasoline',
  transmission: 'automatic',
  engine: '1500',
  price: null,
  main_image: '/media/cars/k5.webp',
  gallery: [],
  manufacturer: 'کره جنوبی',
  body_type: 'سدان',
  color: '',
  technical_description: '',
  catalog_file: null,
  is_active: true,
  is_featured: false,
  display_order: 0,
  is_deleted: false,
  deleted_at: null,
  seo_title: '',
  seo_description: '',
  og_image: null,
  created_at: '2026-09-23T00:00:00Z',
  updated_at: '2026-09-23T00:00:00Z',
}

const paginated = (results: CarAdmin[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

beforeEach(() => {
  jest.clearAllMocks()
})

it('renders cars returned by the admin endpoint', async () => {
  mockListCars.mockResolvedValueOnce(paginated([car]))

  render(<AdminCarsPage />)

  expect((await screen.findAllByText('کیا ک5'))[0]).toBeInTheDocument()
  expect(mockListCars).toHaveBeenCalledTimes(1)
})

it('marks soft-deleted cars with a badge instead of edit/delete actions', async () => {
  mockListCars.mockResolvedValueOnce(paginated([{ ...car, is_deleted: true }]))

  render(<AdminCarsPage />)

  expect((await screen.findAllByText('حذف‌شده')).length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'ویرایش' })).not.toBeInTheDocument()
})

it('restores a soft-deleted car via the restore endpoint', async () => {
  mockListCars.mockResolvedValueOnce(paginated([{ ...car, is_deleted: true }]))
  mockRestoreCar.mockResolvedValueOnce({ ...car, is_deleted: false })
  mockListCars.mockResolvedValueOnce(paginated([car]))

  render(<AdminCarsPage />)

  const restoreButtons = await screen.findAllByRole('button', { name: 'بازیابی' })
  fireEvent.click(restoreButtons[0])

  await waitFor(() => expect(mockRestoreCar).toHaveBeenCalledWith(1))
  await waitFor(() => expect(mockListCars).toHaveBeenCalledTimes(2))
})

it('surfaces a restore failure in the alert banner', async () => {
  mockListCars.mockResolvedValueOnce(paginated([{ ...car, is_deleted: true }]))
  mockRestoreCar.mockRejectedValueOnce(new Error('network'))

  render(<AdminCarsPage />)

  const restoreButtons = await screen.findAllByRole('button', { name: 'بازیابی' })
  fireEvent.click(restoreButtons[0])

  expect(await screen.findByRole('alert')).toHaveTextContent('خطا در بازیابی خودرو')
})

it('deletes after confirming in the accessible dialog', async () => {
  mockListCars.mockResolvedValueOnce(paginated([car]))
  mockDeleteCar.mockResolvedValueOnce(undefined)
  mockListCars.mockResolvedValueOnce(paginated([{ ...car, is_deleted: true }]))

  render(<AdminCarsPage />)

  const deleteButtons = await screen.findAllByRole('button', { name: 'حذف' })
  fireEvent.click(deleteButtons[0])

  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent('آیا از حذف این خودرو اطمینان دارید؟')
  fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }))

  await waitFor(() => expect(mockDeleteCar).toHaveBeenCalledWith(1))
  await waitFor(() => expect(mockListCars).toHaveBeenCalledTimes(2))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
})

it('skips deletion when the confirm dialog is cancelled', async () => {
  mockListCars.mockResolvedValueOnce(paginated([car]))

  render(<AdminCarsPage />)

  const deleteButtons = await screen.findAllByRole('button', { name: 'حذف' })
  fireEvent.click(deleteButtons[0])

  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'انصراف' }))

  expect(mockDeleteCar).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
