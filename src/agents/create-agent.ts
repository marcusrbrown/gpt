import { MessagesAnnotation, StateGraph, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { type AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { type AgentConfig } from '../types/agent';

/**
 * Creates a new agent with the specified configuration.
 *
 * @example
 * ```typescript
 * // Create agent configuration
 * const config: AgentConfig = {
 *   model: "gpt-4",
 *   temperature: 0,
 *   maxTokens: 1000,
 *   capabilities: {
 *     tools: [
 *       // Example tool
 *       new Tool({
 *         name: "search",
 *         description: "Search for information",
 *         func: async (input: string) => "search result"
 *       })
 *     ],
 *     streaming: true,
 *     humanInTheLoop: false,
 *     callbacks: new CallbackManager()
 *   }
 * };
 *
 * // Create the agent
 * const agent = createAgent(config);
 *
 * // Use the agent with memory
 * const result = await agent.invoke({
 *   messages: [{
 *     role: "user",
 *     content: "What is the weather in SF?"
 *   }]
 * }, {
 *   configurable: {
 *     thread_id: "conversation-1",
 *     callbacks: config.capabilities?.callbacks
 *   }
 * });
 * ```
 *
 * @param config - The agent configuration including model settings and capabilities
 * @returns A compiled LangGraph workflow that can be invoked with messages
 */
export function createAgent(config: AgentConfig) {
  const tools = config.capabilities?.tools ?? [];
  const model = new ChatOpenAI({
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }).bindTools(tools);

  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: response };
  }

  function routeModelOutput(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return "__end__";

    // If the LLM is invoking tools, route there.
    if ((lastMessage as AIMessage)?.tool_calls?.length ?? 0 > 0) {
      return "tools";
    }
    // Otherwise end the graph.
    return "__end__";
  }

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge("__start__", "agent")
    .addConditionalEdges(
      "agent",
      routeModelOutput,
      ["tools", "__end__"]
    )
    .addEdge("tools", "agent");

  // Compile with options from capabilities
  return workflow.compile({
    name: "agent-execution",
    ...(config.capabilities?.humanInTheLoop ? { checkpointer: new MemorySaver() } : {})
  });
}
