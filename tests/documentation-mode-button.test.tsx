import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DocumentationModeButton } from "@/src/components/DocumentationModeButton"

describe("DocumentationModeButton", () => {
  it("renders nothing when unavailable", () => {
    const { container } = render(
      <DocumentationModeButton available={false} onActivate={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("calls onActivate when clicked", () => {
    const onActivate = vi.fn()

    render(<DocumentationModeButton available onActivate={onActivate} />)

    fireEvent.click(screen.getByRole("button", { name: "Switch to Documentation Mode" }))

    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
