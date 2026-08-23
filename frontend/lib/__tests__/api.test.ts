import { api } from '../api'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const mockRemoveItem = jest.fn()
const mockSetItem = jest.fn()
const originalLocalStorage = window.localStorage
beforeEach(() => {
  mockRemoveItem.mockClear()
  mockSetItem.mockClear()
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: originalLocalStorage.getItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
      clear: originalLocalStorage.clear.bind(originalLocalStorage),
    },
    writable: true,
    configurable: true,
  })
})
afterEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  })
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '/',
  },
  writable: true,
})

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.setToken(null)
  })

  describe('Authentication', () => {
    it('should set and get token', () => {
      expect(api.getToken()).toBeNull()
      api.setToken('test-token')
      expect(api.getToken()).toBe('test-token')
    })

    it('should include token in requests when set', async () => {
      api.setToken('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      await api.getCurrentUser()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token test-token',
          }),
        })
      )
    })

    it('should not include token when not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      await api.getCurrentUser()

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].headers).not.toHaveProperty('Authorization')
    })
  })

  describe('Login', () => {
    it('should call login endpoint', async () => {
      const mockResponse = { token: 'abc123', user: { id: 1 } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.login('user', 'pass')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'user', password: 'pass' }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should throw on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid credentials' }),
      })

      await expect(api.login('user', 'wrong')).rejects.toThrow('Invalid credentials')
    })

    it('should throw with non_field_errors on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ non_field_errors: ['Account disabled'] }),
      })

      await expect(api.login('user', 'pass')).rejects.toThrow('Account disabled')
    })

    it('should throw generic message on login failure with no detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ field: 'error' }),
      })

      await expect(api.login('user', 'pass')).rejects.toThrow('Request failed with status 400')
    })
  })

  describe('Logout', () => {
    it('should call logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

      await api.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout/'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('Current User', () => {
    it('should fetch current user', async () => {
      const mockUser = { id: 1, username: 'admin', is_staff: true }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })

      const result = await api.getCurrentUser()
      expect(result).toEqual(mockUser)
    })
  })

  describe('Change Password', () => {
    it('should call change-password endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed', token: 'new-token' }),
      })

      const result = await api.changePassword('oldpass', 'newpass')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/change-password/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            old_password: 'oldpass',
            new_password: 'newpass',
            new_password_confirm: 'newpass',
          }),
        })
      )
      expect(result).toEqual({ message: 'Password changed', token: 'new-token' })
    })
  })

  describe('Get Users', () => {
    it('should fetch users list', async () => {
      const mockUsers = [{ id: 1, username: 'admin' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })

      const result = await api.getUsers()
      expect(result).toEqual(mockUsers)
    })
  })

  describe('Cars API', () => {
    it('should fetch cars list', async () => {
      const mockCars = { results: [{ id: 1, brand: 'Toyota' }] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCars,
      })

      const result = await api.getCars()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/'),
        expect.any(Object)
      )
      expect(result).toEqual(mockCars)
    })

    it('should fetch cars with page parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      await api.getCars(2)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/?page=2'),
        expect.any(Object)
      )
    })

    it('should fetch single car', async () => {
      const mockCar = { id: 1, brand: 'Toyota' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCar,
      })

      const result = await api.getCar(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/1/'),
        expect.any(Object)
      )
      expect(result).toEqual(mockCar)
    })

    it('should create car with FormData', async () => {
      const mockCar = { id: 1, brand: 'Honda' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCar,
      })

      const formData = new FormData()
      formData.append('brand', 'Honda')

      const result = await api.createCar(formData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual(mockCar)
    })

    it('should update car with FormData', async () => {
      const mockCar = { id: 1, brand: 'Updated' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCar,
      })

      const formData = new FormData()
      formData.append('brand', 'Updated')

      const result = await api.updateCar(1, formData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/1/'),
        expect.objectContaining({ method: 'PATCH' })
      )
      expect(result).toEqual(mockCar)
    })

    it('should delete car', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      await api.deleteCar(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/cars/1/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should handle create car failure with detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Bad request' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Bad request')
    })

    it('should handle create car failure with message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Validation error' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Validation error')
    })

    it('should handle create car failure with no detail or message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ brand: ['This field is required'] }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Request failed with status 400')
    })

    it('should handle create car failure with empty error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Request failed with status 500')
    })
  })

  describe('Articles API', () => {
    it('should fetch articles list', async () => {
      const mockArticles = { results: [{ id: 1, title: 'Test' }] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      })

      const result = await api.getArticles()

      expect(result).toEqual(mockArticles)
    })

    it('should fetch articles with page parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      await api.getArticles(3)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/articles/?page=3'),
        expect.any(Object)
      )
    })

    it('should fetch single article', async () => {
      const mockArticle = { id: 1, title: 'Test Article' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticle,
      })

      const result = await api.getArticle(1)

      expect(result).toEqual(mockArticle)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/articles/1/'),
        expect.any(Object)
      )
    })

    it('should create article with FormData', async () => {
      const mockArticle = { id: 1, title: 'New Article' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticle,
      })

      const formData = new FormData()
      formData.append('title', 'New Article')

      const result = await api.createArticle(formData)

      expect(result).toEqual(mockArticle)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/articles/'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should update article with FormData', async () => {
      const mockArticle = { id: 1, title: 'Updated' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticle,
      })

      const formData = new FormData()
      formData.append('title', 'Updated')

      const result = await api.updateArticle(1, formData)

      expect(result).toEqual(mockArticle)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/articles/1/'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('should delete article', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      await api.deleteArticle(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/articles/1/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Branches API', () => {
    it('should fetch branches list', async () => {
      const mockBranches = { results: [{ id: 1, name: 'Main' }] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranches,
      })

      const result = await api.getBranches()

      expect(result).toEqual(mockBranches)
    })

    it('should fetch branches with page parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      await api.getBranches(2)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/branches/?page=2'),
        expect.any(Object)
      )
    })

    it('should fetch single branch', async () => {
      const mockBranch = { id: 1, name: 'Main Branch' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranch,
      })

      const result = await api.getBranch(1)

      expect(result).toEqual(mockBranch)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/branches/1/'),
        expect.any(Object)
      )
    })

    it('should create branch', async () => {
      const mockBranch = { id: 1, name: 'New Branch' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranch,
      })

      const result = await api.createBranch({ name: 'New Branch' })

      expect(result).toEqual(mockBranch)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/branches/'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should update branch', async () => {
      const mockBranch = { id: 1, name: 'Updated' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranch,
      })

      const result = await api.updateBranch(1, { name: 'Updated' })

      expect(result).toEqual(mockBranch)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/branches/1/'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('should delete branch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      await api.deleteBranch(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/branches/1/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Inquiries API', () => {
    it('should fetch inquiries list', async () => {
      const mockInquiries = { results: [{ id: 1, name: 'User' }] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInquiries,
      })

      const result = await api.getInquiries()

      expect(result).toEqual(mockInquiries)
    })

    it('should fetch single inquiry', async () => {
      const mockInquiry = { id: 1, name: 'Test User', phone: '09121234567' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInquiry,
      })

      const result = await api.getInquiry(1)

      expect(result).toEqual(mockInquiry)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/inquiries/1/'),
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 unauthorized and clear token', async () => {
      api.setToken('expired-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      })

      await expect(api.getCurrentUser()).rejects.toThrow('Session expired')

      expect(api.getToken()).toBeNull()
      expect(mockRemoveItem).toHaveBeenCalledWith('admin_token')
      expect(window.location.href).toBe('/admin/login')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getCurrentUser()).rejects.toThrow('Network error')
    })

    it('should handle unexpected non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      await expect(api.getCurrentUser()).rejects.toThrow('An unexpected error occurred')
    })

    it('should handle 204 no content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await api.deleteCar(1)
      expect(result).toEqual({})
    })

    it('should handle error with non_field_errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ non_field_errors: ['Something went wrong'] }),
      })

      await expect(api.getCurrentUser()).rejects.toThrow('Something went wrong')
    })

    it('should handle error response with no detail or message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ server: 'error' }),
      })

      await expect(api.getCurrentUser()).rejects.toThrow('Request failed with status 502')
    })

    it('should handle error with message field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Rate limited' }),
      })

      await expect(api.getCurrentUser()).rejects.toThrow('Rate limited')
    })

    it('should handle JSON parse failure on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON') },
      })

      await expect(api.getCurrentUser()).rejects.toThrow('Request failed with status 500')
    })

    it('should handle FormData 401 unauthorized', async () => {
      api.setToken('expired-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Session expired')

      expect(api.getToken()).toBeNull()
      expect(mockRemoveItem).toHaveBeenCalledWith('admin_token')
    })

    it('should handle FormData error with detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid data' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Invalid data')
    })

    it('should handle FormData error with message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'File too large' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('File too large')
    })

    it('should handle FormData error with no detail or message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'something' }),
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Request failed with status 500')
    })

    it('should handle FormData JSON parse failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON') },
      })

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('Request failed with status 500')
    })

    it('should handle FormData unexpected non-Error exception', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const formData = new FormData()
      await expect(api.createCar(formData)).rejects.toThrow('An unexpected error occurred')
    })
  })
})
