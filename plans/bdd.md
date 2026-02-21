# BDD Scenarios & TDD Approach

## Implementation Status (Updated: 2026-02-21)

### ✅ Core Features Implemented

**Connection & Schema:**
- **Feature 1**: Health Check - Connection status monitoring
- **Feature 2**: Schema Browser - List all collections with properties

**Search Modes:**
- **Feature 3**: Semantic Search - near_text with certainty threshold
- **Feature 4**: Keyword Search - BM25 full-text search
- **Feature 5**: Hybrid Search - BM25 + vector with alpha parameter

**Advanced Features:**
- **Feature 6**: Generative Search - RAG with Ollama LLMs
- **Feature 7**: AG Grid Results - Custom cell renderers, tooltips, pagination

---

## Overview

This document defines behavioral specifications for Weaviate-Spy using Gherkin syntax. These scenarios serve as:
- **Executable specifications** for automated testing
- **Documentation** for expected system behavior
- **Acceptance criteria** for each feature

---

## BDD Test Framework

| Tool | Purpose |
|------|---------|
| pytest | Python test framework |
| pytest-asyncio | Async test support |
| httpx | HTTP client for API testing |
| Playwright (optional) | E2E frontend testing |

### Installation

```toml
# pyproject.toml
[project.optional-dependencies]
test = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "httpx>=0.27",
    "pytest-cov>=4.0",
]
```

---

## Feature 1: Health Check

```gherkin
Feature: Health Check
  As a user
  I want to see the Weaviate connection status
  So that I know the system is working

  Background:
    Given the application is running

  Scenario: Health check returns healthy when connected
    Given Weaviate is running at localhost:8080
    When I request GET /health
    Then the response status should be 200
    And the response should contain status: "healthy"
    And the response should contain weaviate: "connected"

  Scenario: Health check returns unhealthy when disconnected
    Given Weaviate is not running
    When I request GET /health
    Then the response status should be 503
    And the response should contain status: "unhealthy"
    And the response should contain weaviate: "disconnected"

  Scenario: Frontend displays connection status
    Given I am on the dashboard
    When the health check completes
    Then I should see a status indicator in the header
    And the status should show "Connected" in green if healthy
    And the status should show "Disconnected" in red if unhealthy
```

---

## Feature 2: Schema Browser

```gherkin
Feature: Schema Browser
  As a user
  I want to view all collections and their properties
  So that I can understand the database structure

  Background:
    Given the application is running
    And Weaviate is connected

  Scenario: List all collections
    Given collections exist in Weaviate
    When I request GET /schema
    Then the response status should be 200
    And the response should be a JSON object
    And each collection should have:
      | Field       | Content              |
      | name        | Collection name      |
      | properties  | Array of properties  |

  Scenario: Get single collection info
    Given collection "Filmy" exists
    When I request GET /collection/Filmy
    Then the response status should be 200
    And the response should contain:
      | Field       | Value              |
      | name        | "Filmy"            |
      | properties  | Array of property definitions |

  Scenario: Collection not found returns 404
    Given collection "NonExistent" does not exist
    When I request GET /collection/NonExistent
    Then the response status should be 404
    And the error message should indicate collection not found

  Scenario: Frontend displays schema in sidebar
    Given I am on the dashboard
    When the schema loads
    Then I should see a sidebar with collection list
    And each collection should be clickable
    And clicking a collection should navigate to /class/{name}

  Scenario: Schema menu item is selected by default
    Given I am on the dashboard
    When the page loads
    Then the "Schema" menu item should be selected
    And the Welcome component should be displayed
```

---

## Feature 3: Semantic Search

```gherkin
Feature: Semantic Search
  As a user
  I want to search using natural language
  So that I can find semantically similar content

  Background:
    Given the application is running
    And Weaviate is connected
    And collection "Filmy" exists with vectorizer

  Scenario: Search with semantic query
    Given I am viewing collection "Filmy"
    And search mode is "semantic"
    When I enter query "kultovní tragikomedie"
    And I click search
    Then the API should call near_text with the query
    And results should be sorted by certainty
    And each result should show certainty score

  Scenario: Adjust certainty threshold
    Given I am viewing collection "Filmy"
    And search mode is "semantic"
    When I set certainty to 0.8
    And I search for "sci-fi film"
    Then only results with certainty >= 0.8 should be returned
    And the certainty slider should show "0.80"

  Scenario: Fetch all objects without query
    Given I am viewing collection "Filmy"
    When I leave the search field empty
    And I view the collection
    Then all objects should be fetched with pagination
    And no certainty threshold should be applied

  Scenario: Certainty score displayed in results
    Given a semantic search returns results
    When I view the AG Grid
    Then the Score column should display certainty values
    And scores >= 0.8 should show green "Excellent"
    And scores 0.6-0.79 should show blue "Good"
    And scores 0.4-0.59 should show orange "Fair"
    And scores < 0.4 should show red "Weak"

  Scenario: API returns semantic search results
    Given I POST to /class/Filmy with:
      | Field      | Value                  |
      | keyword    | "kultovní tragikomedie"|
      | certainty  | 0.65                   |
      | limit      | 20                     |
    Then the response status should be 200
    And the response should contain search_type: "semantic"
    And each result should have uuid and certainty
```

---

## Feature 4: Keyword Search (BM25)

```gherkin
Feature: Keyword Search
  As a user
  I want to search using exact keywords
  So that I can find specific terms

  Background:
    Given the application is running
    And Weaviate is connected
    And collection "Filmy" exists

  Scenario: Search with BM25 query
    Given I am viewing collection "Filmy"
    And search mode is "keyword"
    When I enter query "Praha"
    And I click search
    Then the API should call bm25 with the query
    And results should contain BM25 scores
    And the search_type should be "bm25"

  Scenario: BM25 score display
    Given a BM25 search returns results
    When I view the AG Grid
    Then the Score column should display BM25 scores
    And scores should show relative percentages
    And best match (>=80%) should show green
    And good match (>=50%) should show blue
    And partial match (>=25%) should show orange
    And weak match (<25%) should show red

  Scenario: Keyword mode hides certainty slider
    Given I am viewing a collection
    When I select "Keyword" search mode
    Then the certainty slider should be hidden
    And the search input should remain visible

  Scenario: API returns BM25 search results
    Given I POST to /class/Filmy/bm25 with:
      | Field   | Value    |
      | query   | "Praha"  |
      | limit   | 20       |
    Then the response status should be 200
    And the response should contain search_type: "bm25"
    And each result should have uuid and score
```

---

## Feature 5: Hybrid Search

```gherkin
Feature: Hybrid Search
  As a user
  I want to combine keyword and semantic search
  So that I get best of both worlds

  Background:
    Given the application is running
    And Weaviate is connected
    And collection "Filmy" exists with vectorizer

  Scenario: Search with hybrid mode
    Given I am viewing collection "Filmy"
    And search mode is "hybrid"
    When I enter query "americký film"
    And I set alpha to 0.5
    And I click search
    Then the API should call hybrid with the query
    And the alpha parameter should be 0.5
    And results should show hybrid scores

  Scenario: Adjust alpha for BM25 vs vector balance
    Given I am viewing collection "Filmy"
    And search mode is "hybrid"
    When I set alpha to 0.0
    Then the search should behave like pure BM25
    And when I set alpha to 1.0
    Then the search should behave like pure vector

  Scenario: Alpha slider display
    Given I am viewing a collection
    When I select "Hybrid" search mode
    Then the alpha slider should be visible
    And it should show marks "BM25" at 0 and "Vector" at 1
    And default alpha should be 0.5

  Scenario: API returns hybrid search results
    Given I POST to /class/Filmy/hybrid with:
      | Field  | Value            |
      | query  | "americký film"  |
      | alpha  | 0.5              |
      | limit  | 20               |
    Then the response status should be 200
    And the response should contain search_type: "hybrid"
    And the response should contain alpha: 0.5
    And each result should have uuid and score
```

---

## Feature 6: Generative Search (RAG)

```gherkin
Feature: Generative Search
  As a user
  I want to generate responses using retrieved context
  So that I can get AI-powered summaries

  Background:
    Given the application is running
    And Weaviate is connected
    And collection "Filmy" exists with generative config
    And Ollama is running with granite4:tiny-h model

  Scenario: Generative search with prompt
    Given I am using the API directly
    When I POST to /class/Filmy/generate with:
      | Field    | Value                    |
      | prompt   | "Summarize these movies" |
      | query    | "sci-fi"                 |
      | limit    | 5                        |
    Then the response status should be 200
    And the response should contain search_type: "generative"
    And each result should have a "generated" field

  Scenario: Generative search without query
    Given I am using the API directly
    When I POST to /class/Filmy/generate with:
      | Field    | Value                    |
      | prompt   | "What genres are here?"  |
      | limit    | 10                       |
    Then the API should call generate.fetch_objects
    And results should include generated text

  Scenario: Generative search with certainty threshold
    Given I POST to /class/Filmy/generate with:
      | Field     | Value      |
      | prompt    | "Summarize"|
      | query     | "sci-fi"   |
      | certainty | 0.7        |
      | limit     | 10         |
    Then only objects with certainty >= 0.7 should be used as context
```

---

## Feature 7: AG Grid Results Display

```gherkin
Feature: AG Grid Results Display
  As a user
  I want to explore search results in a grid
  So that I can easily scan and analyze data

  Background:
    Given the application is running
    And I am viewing a collection with data

  Scenario: Results display in AG Grid
    Given a search returns 20 results
    When I view the results
    Then AG Grid should display all 20 rows
    And columns should include uuid, all properties, and score
    And the uuid column should be pinned left
    And the score column should be pinned right

  Scenario: Column headers match property names
    Given collection "Filmy" has properties: title, description, genre, year, origin
    When I view the AG Grid
    Then column headers should be: ID, title, description, genre, year, origin, Score

  Scenario: Long text is truncated with tooltip
    Given a result has description longer than 50 characters
    When I view the cell
    Then the text should be truncated to 50 characters with "..."
    And hovering should show the full text in a tooltip

  Scenario: Arrays display as tags
    Given a result has an array property with 4 items
    When I view the cell
    Then first 2 items should display as tags
    And a "+2" tag should show remaining count
    And hovering should show all items in tooltip

  Scenario: Objects display as badge with tooltip
    Given a result has an object property
    When I view the cell
    Then a blue "Object" tag should be displayed
    And hovering should show JSON representation

  Scenario: Pagination works correctly
    Given a collection has 100 objects
    When I view page 1 with page size 20
    Then I should see first 20 results
    And total count should show 100
    And pagination should show "1-20 of 100 items"
    When I click page 2
    Then I should see results 21-40

  Scenario: Page size options available
    Given I am viewing results
    When I open page size selector
    Then options should include: 10, 20, 50, 100
    And changing page size should reset to page 1

  Scenario: Score column shows visual indicator
    Given a search returns scored results
    When I view the Score column
    Then each row should show a progress bar
    And the color should indicate match quality
    And hovering should show detailed score info including:
      | Info           | Content                    |
      | Score value    | Numeric score              |
      | Level          | Excellent/Good/Fair/Weak   |
      | Relative %     | For BM25/hybrid            |
      | Explanation    | explain_score if available |

  Scenario: Rows have alternating colors
    Given AG Grid displays results
    When I view the grid
    Then even rows should have white background
    And odd rows should have light blue background
    And hovering a row should highlight it

  Scenario: Grid filters work on columns
    Given AG Grid displays results
    When I click filter on a column
    Then a text filter should appear
    And filtering should update displayed rows
```

---

## Feature 8: Aggregation

```gherkin
Feature: Collection Aggregation
  As a user
  I want to aggregate collection data
  So that I can see statistics and distributions

  Background:
    Given the application is running
    And Weaviate is connected
    And collection "Filmy" exists with data

  Scenario: Count total objects
    When I POST to /class/Filmy/aggregate with empty body
    Then the response should contain total_count
    And total_count should match number of objects in collection

  Scenario: Group by property
    When I POST to /class/Filmy/aggregate with:
      | Field     | Value    |
      | group_by  | "genre"  |
    Then the response should contain:
      | Field         | Content                    |
      | total_count   | Total objects              |
      | grouped_by    | "genre"                    |
      | groups        | Array of genre groups      |

  Scenario: Groups contain count per value
    Given collection has movies with genres: Sci-Fi, Drama, Comedy
    When I aggregate grouped by "genre"
    Then each group should have:
      | Field     | Content              |
      | value     | Genre name           |
      | count     | Number of movies     |
```

---

## Feature 9: Error Handling

```gherkin
Feature: Error Handling
  As a user
  I want clear error messages
  So that I can understand and recover from problems

  Scenario: Collection not found
    Given collection "NonExistent" does not exist
    When I request any /class/NonExistent endpoint
    Then the response status should be 404
    And the error message should indicate collection not found

  Scenario: Weaviate connection lost
    Given Weaviate becomes unavailable
    When I make any API request
    Then the response status should be 503
    And the response should contain status: "unhealthy"

  Scenario: Invalid search parameters handled
    Given I POST to /class/Filmy with invalid parameters
    When the request is processed
    Then appropriate error handling should occur
    And the API should not crash

  Scenario: Frontend displays errors gracefully
    Given an API error occurs
    When the frontend receives the error
    Then an error message should be displayed
    And the UI should remain functional
    And the user should be able to retry
```

---

## Feature 10: Sidebar Navigation

```gherkin
Feature: Sidebar Navigation
  As a user
  I want to navigate between collections easily
  So that I can explore different data

  Background:
    Given the application is running
    And Weaviate is connected with multiple collections

  Scenario: Sidebar shows schema and collections
    Given I am on the dashboard
    When the page loads
    Then I should see a sidebar with:
      | Menu Item    | Icon                    |
      | Schema       | BorderlessTableOutlined |
      | Collections  | TableOutlined           |
    And Collections should be expandable

  Scenario: Collections submenu lists all collections
    Given I am on the dashboard
    When I expand the Collections menu
    Then I should see all collection names
    And each should have a DatabaseOutlined icon

  Scenario: Sidebar is collapsible
    Given the sidebar is expanded
    When I click the collapse button
    Then the sidebar should collapse
    And only icons should be visible
    And the logo should show only emoji

  Scenario: Clicking collection navigates to detail
    Given I am on the dashboard
    When I click on "Filmy" in Collections menu
    Then I should navigate to /class/Filmy
    And the ClassData component should load
    And "Filmy" menu item should be selected
```

---

## TDD Implementation Order

### Phase 1: Foundation Tests (2h)

| Order | Test | File | Status |
|-------|------|------|--------|
| 1 | Health check endpoints | `tests/test_health.py` | 📋 |
| 2 | Schema endpoints | `tests/test_schema.py` | 📋 |
| 3 | Basic semantic search | `tests/test_semantic.py` | 📋 |

### Phase 2: Search Tests (2h)

| Order | Test | File | Status |
|-------|------|------|--------|
| 4 | BM25 search | `tests/test_bm25.py` | 📋 |
| 5 | Hybrid search | `tests/test_hybrid.py` | 📋 |
| 6 | Generative search | `tests/test_generative.py` | 📋 |

### Phase 3: Integration Tests (2h)

| Order | Test | File | Status |
|-------|------|------|--------|
| 7 | Aggregation | `tests/test_aggregate.py` | 📋 |
| 8 | Error handling | `tests/test_errors.py` | 📋 |
| 9 | Pagination | `tests/test_pagination.py` | 📋 |

---

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── fixtures/
│   ├── weaviate_mocks.py    # Mock Weaviate responses
│   └── sample_data.py       # Test data factories
├── test_health.py
├── test_schema.py
├── test_semantic.py
├── test_bm25.py
├── test_hybrid.py
├── test_generative.py
├── test_aggregate.py
├── test_errors.py
└── test_pagination.py
```

---

## Definition of Done

- [ ] All BDD scenarios have corresponding tests
- [ ] Tests pass with >80% coverage
- [ ] API documentation matches implementation
- [ ] Frontend displays errors gracefully
- [ ] Search modes work with test collection (Filmy)
- [ ] Performance tests for large collections
- [ ] E2E tests with Playwright (optional)

---

## Execution Log

**Phase 1 - Core Features (Pre-2026):**
- Health check implemented
- Schema browser implemented
- Semantic search implemented
- BM25 search implemented
- Hybrid search implemented
- AG Grid results implemented

**Phase 2 - RAG (2026-02-15):**
- Generative search implemented
- Ollama integration tested with dummy data

**Documentation (2026-02-21):**
- BDD scenarios documented
- Test structure planned

**Pending:**
- BDD test suite creation
- E2E tests with Playwright
- Performance benchmarks
