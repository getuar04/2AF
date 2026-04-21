export interface DomainEvent<TPayload> {
  eventName: string;
  payload: TPayload;
}

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}
