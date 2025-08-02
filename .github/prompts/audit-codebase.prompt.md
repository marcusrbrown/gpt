---
mode: agent
description: 'Comprehensive code audit framework for any codebase, ensuring safety, security, and complete implementation with mandatory quality gates.'
tools: ['changes', 'codebase', 'editFiles', 'fetch', 'findTestFiles', 'githubRepo', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'testFailure', 'usages', 'sequential-thinking', 'get_current_time', 'microsoft.docs.mcp', 'websearch']
---

# Comprehensive Code Audit Framework

**SAFETY NOTICE**: This audit must consider security, bias, privacy, and responsible AI usage throughout all phases. Never expose sensitive data, credentials, or personally identifiable information in audit outputs.

**ADAPTATION NOTICE**: Adapt all commands, tools, and language-specific references to match the project's technology stack, build system, and testing framework.

Use `sequentialthinking` to perform a systematic, verifiable code audit of the entire project codebase. Each phase includes mandatory completion criteria and quality gates that MUST be satisfied before proceeding.

## ADAPTATION GUIDELINES

**Before starting the audit, adapt these elements to your project:**

### Project Context
- Replace generic documentation references with the project's actual documentation files
- Identify the project's architectural principles and design patterns
- Understand the project's specific technology stack and frameworks

### Build & Test Commands
- Replace generic build/test commands with the project's actual commands
- Examples:
  - Node.js: `npm run build`, `npm test`
  - Python: `python -m build`, `pytest`
  - Java: `mvn compile`, `mvn test`
  - Go: `go build`, `go test`
  - Rust: `cargo build`, `cargo test`

### Language-Specific Considerations
- **Static typing**: Focus on type safety for TypeScript, Java, C#, etc.
- **Dynamic typing**: Emphasize runtime validation for Python, JavaScript, etc.
- **Memory management**: Include memory safety for C/C++, Rust
- **Package management**: Adapt dependency analysis to the project's package manager (e.g., npm, pip, Maven, Cargo)

## PHASE 1: PREPARATION (Mandatory Baseline)

**Objective**: Establish audit baseline and safety framework

### Required Actions:
- [ ] **Environment Verification**: Confirm all tools and dependencies are available
- [ ] **Baseline Metrics Collection**: Record current test coverage, bundle size, performance metrics
- [ ] **Security Scan Setup**: Initialize vulnerability scanning tools
- [ ] **Backup Verification**: Ensure current state can be restored if needed

### Quality Gate 1: Environment Ready
- [ ] All required tools are accessible
- [ ] Baseline metrics documented
- [ ] Safety protocols confirmed

## PHASE 2: ANALYSIS (Enhanced Security & Bias Assessment)

**Objective**: Comprehensive evaluation against project requirements with safety considerations

### Required Actions:
- [ ] **Architecture Alignment**: Evaluate against project documentation and requirements
  - Architectural principles compliance (e.g., separation of concerns, modularity)
  - Language/framework best practices adherence
  - Component/module consistency and patterns
  - Performance optimization patterns (lazy loading, code splitting, etc.)
  - External service integrations and API usage

- [ ] **Security Analysis**:
  - Vulnerability scanning of dependencies
  - Data flow analysis for privacy compliance
  - Input validation and sanitization review
  - Authentication and authorization verification

- [ ] **Bias and Fairness Assessment**:
  - AI-generated content review for potential bias
  - Accessibility compliance verification
  - Inclusive design pattern analysis

### Quality Gate 2: Analysis Complete
- [ ] All architectural requirements assessed
- [ ] Security vulnerabilities documented with severity levels
- [ ] Bias assessment completed with findings documented

## PHASE 3: IDENTIFICATION (Critical Priority Framework)

**Objective**: Categorize issues by impact and priority with clear resolution requirements

### Issue Classification (MANDATORY):

#### **CRITICAL ISSUES** (Must Fix - Blocks Phase 4)
- [ ] Build-breaking errors
- [ ] Security vulnerabilities (High/Critical severity)
- [ ] Data corruption risks
- [ ] Performance blockers

#### **HIGH PRIORITY** (Must Address)
- [ ] Functionality-affecting bugs
- [ ] Type safety violations (for statically-typed languages)
- [ ] Accessibility barriers
- [ ] Privacy compliance gaps

#### **MEDIUM PRIORITY** (Should Fix)
- [ ] Code duplication patterns
- [ ] Maintainability concerns
- [ ] TODO comments requiring resolution
- [ ] Documentation gaps

#### **LOW PRIORITY** (Can Defer)
- [ ] Style inconsistencies
- [ ] Minor optimization opportunities
- [ ] Non-critical warnings

### Quality Gate 3: Issues Prioritized
- [ ] All critical issues identified and documented
- [ ] Clear resolution plan for each critical and high-priority issue
- [ ] Impact assessment completed for each issue category

## PHASE 4: REFACTORING (End-to-End Completion Required)

**Objective**: Complete, integrated refactoring with mandatory verification steps

### Critical Requirements (NO PARTIAL COMPLETION):
- [ ] **Module/Component Extraction**: Extract reusable modules and components
- [ ] **Import Path Resolution**: Update all import/include statements
- [ ] **Integration Verification**: Verify integration in all consuming modules
- [ ] **Unused Code Cleanup**: Remove all orphaned code and dependencies
- [ ] **Type Safety Enhancement**: Resolve all compiler errors and warnings
- [ ] **Error Handling**: Implement comprehensive error handling and validation

### Integration Verification (Mandatory for Each Change):
- [ ] Modules/components function without errors in all contexts
- [ ] Dependencies and interfaces work correctly
- [ ] Event handlers and callbacks function as expected
- [ ] State management operates correctly
- [ ] No runtime errors or warnings

### Quality Gate 4: Refactoring Complete
- [ ] ALL refactoring tasks completed end-to-end
- [ ] NO partial implementations remain
- [ ] Integration verified for every changed module/component
- [ ] All new code follows established patterns

## PHASE 5: VERIFICATION (Mandatory Quality Gates)

**Objective**: Comprehensive verification with BLOCKING requirements

### **BLOCKING REQUIREMENTS** (Must Pass 100%):

#### **Build Gate** (MANDATORY)
- [ ] Project builds successfully without errors
- [ ] Language compilation passes with zero errors (if applicable)
- [ ] No build-time warnings for new code

#### **Test Gate** (MANDATORY)
- [ ] Test suite achieves 100% pass rate
- [ ] All existing tests continue to pass
- [ ] New functionality has corresponding tests
- [ ] Test coverage maintained or improved

#### **Critical Lint Gate** (MANDATORY)
- [ ] ZERO critical linting errors
- [ ] All high-priority warnings resolved
- [ ] Remaining warnings documented with justification

#### **Integration Gate** (MANDATORY)
- [ ] Manual verification of all key user workflows
- [ ] End-to-end functionality testing
- [ ] No regression in core features
- [ ] Performance metrics maintained or improved

#### **Security Gate** (MANDATORY)
- [ ] All critical and high-severity vulnerabilities resolved
- [ ] Security best practices implemented
- [ ] No sensitive data exposed in logs or outputs

### Quality Gate 5: Verification Passed
- [ ] ALL quality gates passed with 100% success
- [ ] NO blocking issues remain
- [ ] Comprehensive test results documented

## PHASE 6: OPTIMIZATION (Enhanced Performance & Accessibility)

**Objective**: Performance, accessibility, and security optimization

### Required Actions:
- [ ] **Performance Enhancement**: Bundle size optimization, code splitting, lazy loading
- [ ] **Accessibility Improvement**: WCAG compliance, keyboard navigation, screen reader support
- [ ] **Security Hardening**: Additional security measures, secure coding practices
- [ ] **Code Quality**: Enhanced readability, maintainability, and documentation

### Quality Gate 6: Optimization Complete
- [ ] Performance metrics improved or maintained
- [ ] Accessibility standards met
- [ ] Security posture enhanced
- [ ] Code quality metrics improved

## PHASE 7: DOCUMENTATION (Comprehensive Reporting)

**Objective**: Complete documentation of all changes and decisions

### Required Deliverables:
- [ ] **Technical Changes Report**: Detailed list of all modifications
- [ ] **Architecture Decision Records**: Rationale for significant changes
- [ ] **Test Results Summary**: Complete test execution results
- [ ] **Performance Impact Analysis**: Before/after metrics comparison
- [ ] **Security Assessment**: Vulnerability resolution and improvements
- [ ] **Outstanding Issues**: Documented remaining items with priority levels
- [ ] **Future Recommendations**: Actionable next steps for continued improvement

### Quality Gate 7: Documentation Complete
- [ ] All deliverables completed with sufficient detail
- [ ] Changes are clearly explained and justified
- [ ] Future work is properly prioritized

## FAILURE HANDLING

**If any Quality Gate fails:**
1. **STOP** progression to next phase
2. **DOCUMENT** the specific failure
3. **RESOLVE** the blocking issue completely
4. **RE-VERIFY** the gate before proceeding
5. **UPDATE** documentation with resolution details

## SUCCESS CRITERIA

**Audit is complete ONLY when:**
- [ ] ALL quality gates passed (1-7)
- [ ] ALL critical and high-priority issues resolved
- [ ] ALL tests passing at 100% success rate
- [ ] ALL documentation deliverables completed
- [ ] NO partial implementations or temporary fixes remain

## FINAL DELIVERABLE

Provide a comprehensive audit report including:
1. **Executive Summary** with key findings and improvements
2. **Detailed Technical Report** with all changes documented
3. **Quality Metrics Comparison** (before/after)
4. **Security and Bias Assessment Results**
5. **Outstanding Issues** with clear priority levels
6. **Three Future Improvement Prompts** for continued development

**Remember**: This audit prioritizes safety, security, and complete implementation over speed. Quality gates are mandatory checkpoints that ensure no partial work is left incomplete.
