// TODO: Implement existing chat page

export default async function ChatPage({
    params,
}: {
    params: Promise<{ slug: string[] }>
}) {
    const { slug } = await params;
    return <div>Chat ID: {slug}</div>
}
