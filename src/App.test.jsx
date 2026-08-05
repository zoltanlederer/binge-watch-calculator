import { render, screen, waitFor } from '@testing-library/react'
// render: mounts a component into a fake DOM so it can be tested
// screen: used to query/find rendered elements (inputs, buttons, text)
// waitFor: retries a check until it passes or times out — needed for
// anything that depends on an async operation (like a fetch) finishing
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