Given: Sally harsh-notes input, Professional tone, Parent message mode
When: the draft route is called
Then:
  - output contains "Sally"
  - output contains a greeting matching /^Dear Parent\/Carer,|^Hello \w+,/
  - output does NOT contain "Hello ,"
  - output ends with a sign-off block
  - output does NOT contain "calm update"
  - output mentions at least two of: lateness, behaviour, homework