import { render, screen, waitFor } from '@testing-library/react'
// render: mounts a component into a fake DOM so it can be tested
// screen: used to query/find rendered elements (inputs, buttons, text)
// waitFor: retries a check until it passes or times out — needed for
// anything that depends on an async operation (like a fetch) finishing
import userEvent from '@testing-library/user-event'
import App from './App'

// Runs before EVERY test in this file, giving each one a fresh, empty
// mock — without this, one test's fake fetch responses could leak into
// the next test and cause confusing false passes/failures
beforeEach(() => {
    // Replaces the real global fetch with a fake, controllable function.
    // Without this, App's trending-shows useEffect would try to hit the
    // real TMDB API on every single render during tests.
    global.fetch = jest.fn()
})

// async because this test needs to `await` the fetch's Promise chain
// before it ends (see waitFor below)
test('renders the search input', async () => {
    // Tells the mock fetch what to "resolve" with the NEXT time it's
    // called — shaped to match what App's code expects to read
    // (response.ok, then response.json())
    fetch.mockResolvedValueOnce({
        ok: true,
        // json must be a function returning a Promise, since real
        // fetch responses' .json() is also async
        json: async () => ({ results: [] }),
    })

    // Mounts App into the fake DOM. This immediately triggers the
    // trending-shows useEffect, which calls the mocked fetch above.
    render(<App />)

    // Finds the <input type="text"> by its accessibility role.
    // The input exists in the JSX from the very first render, so this
    // doesn't need to wait for anything async.
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()

    // Without this, the test would finish before the mocked fetch's
    // .then() chain resolves, causing React to update state (setTrendingShows)
    // AFTER the test already ended — which triggers an "act() warning"
    // because React expects state updates to happen inside a tracked test step.
    //
    // waitFor keeps retrying this check until it passes, which forces
    // the test to stay alive long enough for the pending fetch Promise
    // to actually resolve before Jest tears everything down.
    await waitFor(() => {
        expect(fetch).toHaveBeenCalled()
    })
})

// Confirms trending shows fetched on mount actually render as posters
// on screen, with the correct image URL built from poster_path.
// Uses real show data (The Big Bang Theory) so the expected URL is
// something concrete and verifiable, not arbitrary.
test('shows trending shows on the empty state', async () => {
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            results: [{
                id: 1418,
                name: 'The Big Bang Theory',
                // TMDB's real API returns just the path, not the full URL —
                // getPosterUrl is responsible for building the full URL
                poster_path: '/euKFiO5M125rpngFRBbSW83beeI.jpg'
            }]
        })
    })

    render(<App />)

    // findByRole (not getByRole) because the poster only appears AFTER
    // the mocked fetch resolves — findBy returns a Promise and retries
    // until the element appears, so no extra waitFor is needed here.
    // Matches the FULL alt text ("{name} poster"), not just the name,
    // since that's what TrendingPosterList actually renders.
    const poster = await screen.findByRole('img', { name: 'The Big Bang Theory poster' })

    // Hand-verified expected URL: posterBaseUrl + 'w500' + poster_path,
    // matching getPosterUrl's own concatenation logic, but written out
    // independently here rather than calling that function
    expect(poster).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/euKFiO5M125rpngFRBbSW83beeI.jpg')
})

test('typing a search term shows matching results', async () => {
    // Trending fetch, fired on mount — matches nothing here since we
    // don't care about trending shows in this test
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
    })

    // Search fetch, fired after the 500ms debounce once typing happens
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            results: [{
                id: 1418,
                poster_path: "/euKFiO5M125rpngFRBbSW83beeI.jpg",
                first_air_date: "2007",
                name: "The Big Bang Theory",
            }]
        }),
    })

    render(<App />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'The Big Bang Theory')

    // findByText already retries/waits — giving it a longer timeout
    // covers the real 500ms debounce without needing fake timers
    const result = await screen.findByText('The Big Bang Theory', {}, { timeout: 2000 })
    expect(result).toBeInTheDocument()
})

// Simulates a failed search fetch (response.ok: false) and confirms the
// generic error message appears. Note: App's .catch() ignores the actual
// thrown error's message and always shows this fixed string — so the
// mocked status code (500) doesn't need to be exact, it's never displayed.
test('shows an error message when the search fetch fails', async () => {
    // Trending fetch on mount — succeeds normally, not the focus here
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
    })

    // Search fetch — simulates a bad response (e.g. server error)
    fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
    })

    render(<App />)
    const input = screen.getByRole('textbox')

    // Must actually type something — searchInput.length < 2 skips the
    // fetch entirely, so without this the search fetch never fires
    await userEvent.type(input, 'test')

    const text = await screen.findByText("Couldn't search right now. Try again in a moment.")
    expect(text).toBeInTheDocument()
})