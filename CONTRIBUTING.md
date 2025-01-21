# Contributing to AnkiAssistant

Thank you for your interest in contributing to **AnkiAssistant**! By helping improve this project, you’ll be benefiting everyone who uses it. This document outlines the guidelines for contributing code, documentation, and other forms of participation.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Issues and Feature Requests](#issues-and-feature-requests)
4. [Pull Requests](#pull-requests)
5. [Testing](#testing)
6. [Code Style](#code-style)
7. [License and Contributions](#license-and-contributions)
8. [Contact](#contact)

---

## 1. Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/) as our Code of Conduct. Please review it to understand what behaviors are expected and what behaviors are not acceptable.

## 2. Getting Started

1. **Fork this repository**  
   Create a personal copy of the repository by clicking “Fork” at the top of this page.

2. **Clone your fork**  
   ```bash
   git clone https://github.com/your-username/AnkiAssistant.git
   cd AnkiAssistant
   ```

3. **Create a new branch**  
   Always create a new branch to work on a feature or bug fix:  
   ```bash
   git checkout -b feature/my-feature
   ```

4. **Set up development environment**  
   Please see the [README](./README.md) for instructions on installing dependencies and setting up a dev environment.

5. **Review Area-Specific Guidelines**  
   Depending on your focus area, please also review:
   - Frontend Development: See [`/web/CONTRIBUTING.md`](./web/CONTRIBUTING.md)
   - AI/Models Development: See [`/models/CONTRIBUTING.md`](./models/CONTRIBUTING.md)

## 3. Issues and Feature Requests

- **Check existing issues**  
  Before opening a new issue or feature request, please check if someone has already reported a similar problem or idea.
- **Open a new issue**  
  If no existing issue addresses your concern, open a new one and describe the issue or feature request in detail.

## 4. Pull Requests

1. **Commit your changes**  
   Write clear, concise commit messages summarizing the changes.  
   ```bash
   git add .
   git commit -m "Add feature X to improve Y"
   ```
2. **Push your branch**  
   ```bash
   git push origin feature/my-feature
   ```
3. **Open a Pull Request**  
   Go to your fork on GitHub and open a Pull Request (PR) against the `main` (or relevant) branch of the upstream repository. In your PR description:
   - Reference any related issues (e.g., “Closes #15”).
   - Clearly describe the change and the motivation for it.

## 5. Testing

- **Run tests locally**  
  Make sure your changes pass all existing tests. If you added new functionality, include tests that cover it.
- **Continuous Integration**  
  The repository may use automated checks (CI). Your PR should pass these checks before merging.

## 6. Code Style

- **Formatting**  
  Please keep consistent formatting; we recommend using a linter or code formatter if available.
- **Naming Conventions**  
  Use descriptive names for variables, functions, and classes.  
- **Documentation**  
  Add or update documentation (comments, docstrings, or markdown files) when you introduce a new feature or make significant changes to existing code.

## 7. License and Contributions

This project is licensed under the **Business Source License 1.1**. By submitting a contribution (e.g., via pull request), you agree that your contributions are made available under the same **Business Source License 1.1** terms.

- **Business Source License (BSL) 1.1**  
Please review the [LICENSE](./LICENSE) file for details.

By contributing, you confirm that:
- You have the necessary rights to grant us permission to use your contributions in the project.
- You understand that all contributions will be under the same license as the main project (BSL 1.1, transitioning to GPLv3 after the Change Date).


---

*Thank you again for your interest in making AnkiAssistant better! We appreciate your time and effort.*