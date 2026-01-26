export function enforceGreetingLine(body: string, greetingLine: string) {
  if (!greetingLine) {
    return body
  }

  const normalizedGreeting = greetingLine.trim()
  if (!normalizedGreeting) {
    return body
  }

  const lines = body.split(/\r?\n/)
  let index = 0
  while (index < lines.length && !lines[index].trim()) {
    index += 1
  }

  if (index === lines.length) {
    return normalizedGreeting
  }

  if (lines[index].trim() === normalizedGreeting) {
    return body
  }

  lines[index] = normalizedGreeting
  return lines.join("\n")
}

export function applyFinalGreetingGuard(body: string, greetingLine?: string | null) {
  if (!greetingLine) {
    return body
  }
  return enforceGreetingLine(body, greetingLine)
}
