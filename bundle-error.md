# Fix: `bundle install` Fails with Ruby Dev Headers Error

## Error Symptoms

You'll see one or both of these errors:

```
mkmf.rb can't find header files for ruby at /usr/lib/ruby/include/ruby.h
You might have to install separate package for the ruby development environment, ruby-dev or ruby-devel
```

```
Your user account isn't allowed to install to the system RubyGems.
```

## Fix (run in order)

**Step 1 — Install Ruby dev headers:**
```bash
sudo apt-get install ruby-dev
```

**Step 2 — Configure bundler to install locally (avoids sudo issues):**
```bash
bundle config set --local path 'vendor/bundle'
bundle install
```

**Step 3 — Add webrick if missing (required for Jekyll on Ruby 3+):**

First check if it's already in your `Gemfile`. If not, add it:
```bash
bundle add webrick
```
> ⚠️ Skip this if you get: *"You cannot specify the same gem twice"* — it means webrick is already there.

**Step 4 — Exclude vendor folder from Jekyll builds:**

Add this to your `_config.yml` (create it if it doesn't exist):
```yaml
exclude:
  - vendor/bundle
```
> ⚠️ Without this, Jekyll will scan gem template files inside `vendor/` and throw an *"Invalid date"* error.

**Step 5 — Start the Jekyll server:**
```bash
bundle exec jekyll serve
```

Your site will be available at `http://localhost:4000`.

That's it. Step 1 fixes the missing `ruby.h` header, Step 2 fixes the permissions issue, Step 3 adds webrick if needed, Step 4 starts the server.

## Why This Happens

- `ruby-dev` contains C header files required to compile native gem extensions (like `bigdecimal`, `ffi`, `json`, etc.)
- Without it, gems with native extensions can't build
- The local path config avoids needing root permissions to install gems system-wide

## Notes

- The `vendor/bundle` directory will be created in your project folder — you can add it to `.gitignore`
- This config is saved in `.bundle/config` inside your project, so you only need to run Step 2 once per project
- After this, just run `bundle install` normally for future installs

## Context

This was encountered while setting up a **Jekyll / GitHub Pages** site on Ubuntu.