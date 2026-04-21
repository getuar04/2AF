import { DomainEvent, EventBus } from "../../app/ports/eventBus";

export class NoopEventBus implements EventBus {
  public readonly events: DomainEvent<unknown>[] = [];

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.events.push(event as DomainEvent<unknown>);
  }
}
