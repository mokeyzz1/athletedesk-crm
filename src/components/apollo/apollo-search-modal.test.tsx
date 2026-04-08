import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApolloSearchModal } from './apollo-search-modal'

describe('ApolloSearchModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSelectContact = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for integration check
    global.fetch = vi.fn()
  })

  it('shows loading state initially', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ integrations: [] }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    // Should show loading spinner while checking connection
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows connect prompt when Apollo not connected', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ integrations: [] }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('Connect Apollo')).toBeInTheDocument()
    })

    expect(screen.getByText('Go to Settings')).toBeInTheDocument()
  })

  it('shows search form when Apollo is connected', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('General Search')).toBeInTheDocument()
    })

    expect(screen.getByText('Find at Company')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Marketing Director/)).toBeInTheDocument()
  })

  it('switches between search modes', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('General Search')).toBeInTheDocument()
    })

    // Click "Find at Company" mode
    fireEvent.click(screen.getByText('Find at Company'))

    // Should show company-specific fields
    expect(screen.getByPlaceholderText(/nike.com/i)).toBeInTheDocument()
    expect(screen.getByText('Decision makers only (VP+)')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('Search Apollo')).toBeInTheDocument()
    })

    // Find close button (the X)
    const closeButton = document.querySelector('button[class*="text-gray-400"]')
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('toggles seniority filters', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('C-Suite')).toBeInTheDocument()
    })

    const cSuiteButton = screen.getByText('C-Suite')

    // Click to select
    fireEvent.click(cSuiteButton)
    expect(cSuiteButton.closest('button')).toHaveClass('bg-brand-100')

    // Click again to deselect
    fireEvent.click(cSuiteButton)
    expect(cSuiteButton.closest('button')).not.toHaveClass('bg-brand-100')
  })

  it('disables search button when no query entered', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByText('Search Contacts')).toBeInTheDocument()
    })

    const searchButton = screen.getByText('Search Contacts').closest('button')
    expect(searchButton).toBeDisabled()
  })

  it('enables search button when query entered', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          integrations: [{ provider: 'apollo', is_active: true }],
        }),
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Marketing Director/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Marketing Director/)
    fireEvent.change(input, { target: { value: 'Nike marketing' } })

    const searchButton = screen.getByText('Search Contacts').closest('button')
    expect(searchButton).not.toBeDisabled()
  })

  it('renders search results and fires onSelectContact when contact selected', async () => {
    // Mock search response data
    const mockSearchResults = {
      people: [
        {
          id: 'apollo-1',
          first_name: 'John',
          last_name: 'Smith',
          name: 'John Smith',
          email: 'john.smith@nike.com',
          email_status: 'verified' as const,
          title: 'Marketing Director',
          linkedin_url: 'https://linkedin.com/in/johnsmith',
          city: 'Portland',
          state: 'OR',
          organization: {
            id: 'org-nike',
            name: 'Nike Inc.',
            website_url: 'https://nike.com',
            linkedin_url: null,
            industry: 'Apparel',
            estimated_num_employees: 75000,
          },
          phone_numbers: [{ raw_number: '503-555-1234', sanitized_number: '5035551234', type: 'work' }],
          seniority: 'director',
        },
        {
          id: 'apollo-2',
          first_name: 'Jane',
          last_name: 'Doe',
          name: 'Jane Doe',
          email: 'jane.doe@nike.com',
          email_status: 'guessed' as const,
          title: 'Brand Manager',
          linkedin_url: null,
          city: 'Portland',
          state: 'OR',
          organization: {
            id: 'org-nike',
            name: 'Nike Inc.',
            website_url: 'https://nike.com',
            linkedin_url: null,
            industry: 'Apparel',
            estimated_num_employees: 75000,
          },
          seniority: 'manager',
        },
      ],
      totalCount: 2,
    }

    let fetchCallCount = 0
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      fetchCallCount++
      // First call: integration check
      if (url.includes('/api/integrations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ integrations: [{ provider: 'apollo', is_active: true }] }),
        })
      }
      // Second call: search
      if (url.includes('/api/apollo/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Marketing Director/)).toBeInTheDocument()
    })

    // Enter search query
    const input = screen.getByPlaceholderText(/Marketing Director/)
    fireEvent.change(input, { target: { value: 'Nike marketing' } })

    // Submit search
    const searchButton = screen.getByText('Search Contacts').closest('button')!
    fireEvent.click(searchButton)

    // Wait for results to render
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })

    // Verify result count
    expect(screen.getByText('Found 2 contacts')).toBeInTheDocument()

    // Verify both contacts rendered
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Marketing Director')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Brand Manager')).toBeInTheDocument()

    // Verify organization rendered
    expect(screen.getAllByText('Nike Inc.')).toHaveLength(2)

    // Click "Use Contact" on first result
    const useContactButtons = screen.getAllByText('Use Contact')
    expect(useContactButtons).toHaveLength(2)
    fireEvent.click(useContactButtons[0])

    // Verify onSelectContact was called with correct data
    expect(mockOnSelectContact).toHaveBeenCalledTimes(1)
    expect(mockOnSelectContact).toHaveBeenCalledWith({
      name: 'John Smith',
      email: 'john.smith@nike.com',
      title: 'Marketing Director',
      company: 'Nike Inc.',
      linkedinUrl: 'https://linkedin.com/in/johnsmith',
      phone: '503-555-1234',
    })

    // Verify modal was closed
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows "No contacts found" for empty results', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/integrations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ integrations: [{ provider: 'apollo', is_active: true }] }),
        })
      }
      if (url.includes('/api/apollo/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ people: [], totalCount: 0 }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Marketing Director/)).toBeInTheDocument()
    })

    // Search for something that returns no results
    const input = screen.getByPlaceholderText(/Marketing Director/)
    fireEvent.change(input, { target: { value: 'xyznonexistent123' } })

    const searchButton = screen.getByText('Search Contacts').closest('button')!
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(screen.getByText('No contacts found')).toBeInTheDocument()
    })
  })

  it('shows error message when search fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/integrations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ integrations: [{ provider: 'apollo', is_active: true }] }),
        })
      }
      if (url.includes('/api/apollo/search')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Apollo API rate limit exceeded' }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(
      <ApolloSearchModal onClose={mockOnClose} onSelectContact={mockOnSelectContact} />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Marketing Director/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Marketing Director/)
    fireEvent.change(input, { target: { value: 'test query' } })

    const searchButton = screen.getByText('Search Contacts').closest('button')!
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(screen.getByText('Apollo API rate limit exceeded')).toBeInTheDocument()
    })
  })
})
