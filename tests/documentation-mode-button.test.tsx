import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DocumentationModeButton } from "@/src/components/DocumentationModeButton"

describe("DocumentationModeButton", () => {
  it("renders nothing when unavailable", () => {
    const { container } = render(
      <DocumentationModeButton visible={false} label="Switch to Documentation Mode" onActivate={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("calls onActivate when clicked", () => {
    const onActivate = vi.fn()

    render(
      <DocumentationModeButton
        visible
        label="Switch to Documentation Mode"
        onActivate={onActivate}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Switch to Documentation Mode" }))

    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
