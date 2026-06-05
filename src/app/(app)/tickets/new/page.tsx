import NewTicketForm from "@/components/NewTicketForm";

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="mb-5 text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Новый тикет
      </h1>
      <NewTicketForm />
    </div>
  );
}
