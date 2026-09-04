import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminBranchesPage from '../page'
import {
  deleteBranch,
  listBranches,
  setBranchActive,
} from '@/lib/api/branches'
import type { BranchAdmin } from '@/types/branch'

jest.mock('@/lib/api/branches')

const mockListBranches = listBranches as jest.MockedFunction<typeof listBranches>
const mockSetBranchActive = setBranchActive as jest.MockedFunction<typeof setBranchActive>
const mockDeleteBranch = deleteBranch as jest.MockedFunction<typeof deleteBranch>

const branch: BranchAdmin = {
  id: 1,
  name: 'شعبه مرکزی ساری',
  address: 'ساری، خیابان امام',
  phone: '09112100800',
  map_url: 'https://neshan.ir/',
  map_image: '/media/branches/map.jpg',
  latitude: 36.56,
  longitude: 53.06,
  is_active: true,
  display_order: 0,
  is_deleted: false,
  deleted_at: null,
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('renders branches returned by the typed endpoint', async () => {
  mockListBranches.mockResolvedValueOnce({
    count: 1,
    next: null,
    previous: null,
    results: [branch],
  })

  render(<AdminBranchesPage />)

  expect(await screen.findByText('شعبه مرکزی ساری')).toBeInTheDocument()
  expect(screen.getByText('ساری، خیابان امام')).toBeInTheDocument()
  expect(mockListBranches).toHaveBeenCalledTimes(1)
})

it('shows the empty state when there are no branches', async () => {
  mockListBranches.mockResolvedValueOnce({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })

  render(<AdminBranchesPage />)

  expect(await screen.findByText('شعبه‌ای وجود ندارد')).toBeInTheDocument()
})

it('toggles branch activity through the typed endpoint', async () => {
  mockListBranches.mockResolvedValueOnce({
    count: 1,
    next: null,
    previous: null,
    results: [branch],
  })
  mockSetBranchActive.mockResolvedValueOnce({ ...branch, is_active: false })
  mockListBranches.mockResolvedValueOnce({
    count: 1,
    next: null,
    previous: null,
    results: [{ ...branch, is_active: false }],
  })

  render(<AdminBranchesPage />)

  const toggle = await screen.findByRole('button', { name: 'فعال' })
  fireEvent.click(toggle)

  expect(mockSetBranchActive).toHaveBeenCalledWith(1, false)
  await waitFor(() => expect(mockListBranches).toHaveBeenCalledTimes(2))
})

it('surfaces a load failure instead of silently showing an empty list', async () => {
  mockListBranches.mockRejectedValueOnce(new Error('network'))

  render(<AdminBranchesPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('خطا در بارگذاری شعب')
})

it('deletes after confirmation through the typed endpoint', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
  mockListBranches.mockResolvedValueOnce({
    count: 1,
    next: null,
    previous: null,
    results: [branch],
  })
  mockDeleteBranch.mockResolvedValueOnce(undefined)
  mockListBranches.mockResolvedValueOnce({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })

  render(<AdminBranchesPage />)

  const deleteButton = await screen.findByRole('button', { name: 'حذف' })
  fireEvent.click(deleteButton)

  expect(confirmSpy).toHaveBeenCalled()
  expect(mockDeleteBranch).toHaveBeenCalledWith(1)
  await waitFor(() => expect(screen.getByText('شعبه‌ای وجود ندارد')).toBeInTheDocument())
  confirmSpy.mockRestore()
})

it('skips deletion when the confirm dialog is dismissed', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
  mockListBranches.mockResolvedValueOnce({
    count: 1,
    next: null,
    previous: null,
    results: [branch],
  })

  render(<AdminBranchesPage />)

  const deleteButton = await screen.findByRole('button', { name: 'حذف' })
  fireEvent.click(deleteButton)

  expect(mockDeleteBranch).not.toHaveBeenCalled()
  confirmSpy.mockRestore()
})
