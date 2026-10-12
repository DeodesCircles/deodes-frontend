import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { OptimizedImage } from "../optimized-image"

// next/image renders an <img> in tests
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe("OptimizedImage", () => {
  it("renders an img element", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} />,
    )
    expect(container.querySelector("img")).toBeTruthy()
  })

  it("applies lazy loading by default", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} />,
    )
    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
  })

  it("does not set loading when priority is true", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} priority />,
    )
    const img = container.querySelector("img")
    // priority overrides lazy — loading should be undefined/absent
    expect(img?.getAttribute("loading")).toBeNull()
  })

  it("applies default sizes of 100vw", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} />,
    )
    const img = container.querySelector("img")
    expect(img?.getAttribute("sizes")).toBe("100vw")
  })

  it("respects custom sizes prop", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} sizes="50vw" />,
    )
    const img = container.querySelector("img")
    expect(img?.getAttribute("sizes")).toBe("50vw")
  })

  it("respects custom loading prop", () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test" width={100} height={100} loading="eager" />,
    )
    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("eager")
  })
})
