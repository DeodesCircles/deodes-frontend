import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import PeopleDirectoryPage from "../page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe("PeopleDirectoryPage", () => {
  it("renders people directory header and search input", async () => {
    render(<PeopleDirectoryPage />)
    expect(screen.getByTestId("people-directory")).toBeDefined()
    expect(screen.getByText("People Directory")).toBeDefined()
    expect(screen.getByTestId("people-search-input")).toBeDefined()
  })

  it("filters members by search query", async () => {
    render(<PeopleDirectoryPage />)
    // Wait for skeleton timer to finish
    await new Promise((r) => setTimeout(r, 450))

    const input = screen.getByTestId("people-search-input")
    fireEvent.change(input, { target: { value: "Amara" } })

    expect(screen.getByText("Amara Okonkwo")).toBeDefined()
    expect(screen.queryByText("Carlos Silva")).toBeNull()
  })

  it("shows empty state when no results match filter", async () => {
    render(<PeopleDirectoryPage />)
    await new Promise((r) => setTimeout(r, 450))

    const input = screen.getByTestId("people-search-input")
    fireEvent.change(input, { target: { value: "NonExistentUser12345" } })

    expect(screen.getByTestId("people-empty-state")).toBeDefined()
    expect(screen.getByText("No members found")).toBeDefined()
  })
})
