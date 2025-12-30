import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, ChevronRight, RefreshCw, LayoutTemplate } from 'lucide-react';

// Types
interface Article {
    id: number;
    originalTitle: string;
    originalContent: string;
    updatedContent?: string;
    referenceLinks?: string;
    isProcessed: boolean;
    createdAt: string;
}

const API_URL = 'http://localhost:3000';

function ArticleList() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/articles`);
            setArticles(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <LayoutTemplate className="w-8 h-8 text-indigo-600" />
                    BeyondChats Archive
                </h1>
                <button
                    onClick={fetchArticles}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article) => (
                        <Link
                            key={article.id}
                            to={`/article/${article.id}`}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 group"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${article.isProcessed
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {article.isProcessed ? 'AI Enhanced' : 'Original'}
                                    </span>
                                    <Book className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                    {article.originalTitle}
                                </h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    {new Date(article.createdAt).toLocaleDateString()}
                                </p>
                                <div className="flex items-center text-indigo-600 text-sm font-medium">
                                    Read Analysis <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function ArticleDetail() {
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const id = window.location.pathname.split('/').pop();

    useEffect(() => {
        if (id) {
            axios.get(`${API_URL}/articles/${id}`)
                .then(res => setArticle(res.data))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) return <div className="p-12 text-center">Loading...</div>;
    if (!article) return <div className="p-12 text-center text-red-500">Article not found</div>;

    const links = article.referenceLinks ? JSON.parse(article.referenceLinks) : [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <Link to="/" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                    &larr; Back to Dashboard
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-8 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">{article.originalTitle}</h1>
                    <p className="text-gray-500 mt-2 text-sm">Processed on {new Date(article.createdAt).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
                    {/* Original */}
                    <div className="p-8">
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-gray-300 rounded-full"></span>
                            Original Content
                        </h2>
                        <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {article.originalContent}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* AI Version */}
                    <div className="p-8 bg-indigo-50/30">
                        <h2 className="text-xl font-bold text-indigo-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                            AI Enhanced Version
                        </h2>
                        {article.updatedContent ? (
                            <div className="prose prose-indigo max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {article.updatedContent}
                                </ReactMarkdown>

                                {links.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-indigo-100">
                                        <h4 className="font-semibold text-gray-900 mb-3">Sources Utilized:</h4>
                                        <ul className="space-y-2">
                                            {links.map((link: string, i: number) => (
                                                <li key={i}>
                                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm break-all flex items-start gap-2">
                                                        <span className="mt-1 block min-w-[4px] h-[4px] bg-indigo-400 rounded-full"></span>
                                                        {link}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                <p>AI processing pending or failed.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
                <Routes>
                    <Route path="/" element={<ArticleList />} />
                    <Route path="/article/:id" element={<ArticleDetail />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
