import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function App() {
    const [username, setUsername] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [responses, setResponses] = useState({});
    const [showResultsPerson, setShowResultsPerson] = useState(false);
    const [showResultsTotal, setShowResultsTotal] = useState(false);

    const API_BASE = 'http://10.0.1.141:30001';

    const people = ['Fredrik', 'Erik', 'Frida', 'Micaela', 'Simon', 'Oskar', 'Andre', 'Per'];

    const legendCards = [
        {
            code: 'Blue',
            title: '🔵 Blue – The Analytical / Technical Type',
            hex: '#3B82F6',
            traits: 'Precise, detail-oriented, logical, and cautious.',
            focus: 'Accuracy, data, and doing things the “right” way.',
            strengths: 'Planning, structure, and high quality standards.',
            challenges: 'Can overthink or hesitate without all the facts.',
            motto: '“Do it right.”',
        },
        {
            code: 'Red',
            title: '🔴 Red – The Driver / Competitive Type',
            hex: '#EF4444',
            traits: 'Bold, determined, goal-oriented, and confident.',
            focus: 'Results, speed, and getting things done.',
            strengths: 'Decisive, strong-willed, and inspiring under pressure.',
            challenges: 'Can be impatient or come off as demanding.',
            motto: '“Do it now.”',
        },
        {
            code: 'Yellow',
            title: '🟡 Yellow – The Expressive / Social Type',
            hex: '#FACC15',
            traits: 'Energetic, enthusiastic, creative, and spontaneous.',
            focus: 'People, ideas, and having fun while working.',
            strengths: 'Positivity, communication, and motivating others.',
            challenges: 'Can lose focus or skip details.',
            motto: '“Let’s do it together!”',
        },
        {
            code: 'Green',
            title: '🟢 Green – The Amiable / Supportive Type',
            hex: '#22C55E',
            traits: 'Kind, patient, loyal, and empathetic.',
            focus: 'Harmony, cooperation, and steady progress.',
            strengths: 'Team spirit, listening, and consistency.',
            challenges: 'Can avoid conflict or change.',
            motto: '“Let’s do it calmly.”',
        },
    ];

    useEffect(() => {
        const savedUser = localStorage.getItem('username');
        if (savedUser) {
            setUsername(savedUser);
            setLoggedIn(true);
        }

        fetch(`${API_BASE}/results.json`)
            .then(res => res.json())
            .then(data => {
                setResponses(data);
                localStorage.setItem('responses', JSON.stringify(data));
            })
            .catch(() => {
                const saved = JSON.parse(localStorage.getItem('responses')) || {};
                setResponses(saved);
            });
    }, []);

    const handleLogin = () => {
        if (username.trim()) {
            setLoggedIn(true);
            localStorage.setItem('username', username);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('username');
        setUsername('');
        setLoggedIn(false);
    };

    const selectColor = async (person, color) => {
        const updated = { ...responses };
        updated[person] = [color];
        setResponses(updated);
        localStorage.setItem('responses', JSON.stringify(updated));

        await fetch(`${API_BASE}/api/update-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person, color, user: username }),
        });
    };

    const chartDataPerPerson = Object.entries(responses).map(([person, votes]) => {
        const voteArray = Array.isArray(votes) ? votes : [votes];
        const counts = legendCards.reduce((acc, c) => {
            acc[c.code] = voteArray.filter(v => v === c.code || v.color === c.code).length;
            return acc;
        }, {});
        return { name: person, ...counts };
    });

    const totalCounts = legendCards.map(c => {
        let total = 0;
        Object.values(responses).forEach(votes => {
            const voteArray = Array.isArray(votes) ? votes : [votes];
            total += voteArray.filter(v => v === c.code || v.color === c.code).length;
        });
        return { name: c.code, count: total, color: c.hex };
    });

    const getTeamBalanceSummary = () => {
        const counts = totalCounts.map(t => t.count);
        const max = Math.max(...counts);
        const min = Math.min(...counts);

        if (max === 0) return 'No votes yet.';

        const difference = max - min;
        const dominantColor = totalCounts.find(t => t.count === max)?.name;

        if (difference <= 1) return '🟢 Balanced team — good mix of personalities.';
        if (difference <= 3) return `🟠 Slightly skewed — ${dominantColor} is a bit more common.`;
        return `🔴 Unbalanced — team dominated by ${dominantColor}.`;
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 relative">
            {loggedIn && (
                <button
                    onClick={handleLogout}
                    className="absolute top-4 right-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md"
                >
                    🚪 Logout
                </button>
            )}

            {!loggedIn ? (
                <div className="text-center mt-20">
                    <h1 className="text-3xl font-bold mb-4">Login Anonymously</h1>
                    <input
                        className="border p-2 rounded mr-2 shadow"
                        placeholder="Enter any name or code"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <button
                        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </div>
            ) : (
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-center">Color Type Survey</h1>

                    {/* Poll section */}
                    {username.toLowerCase() !== 'svenne' && (
                        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                            <h2 className="text-xl font-semibold mb-4">Select Color for Each Person</h2>
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-200 text-left">
                                    <th className="p-2">Person</th>
                                    <th className="p-2">Choose Color</th>
                                </tr>
                                </thead>
                                <tbody>
                                {people.map(person => (
                                    <tr key={person} className="border-t">
                                        <td className="p-2 font-medium">{person}</td>
                                        <td className="p-2">
                                            <div className="flex gap-2 flex-wrap">
                                                {legendCards.map(c => {
                                                    const isSelected = responses[person]?.[0]?.color === c.code || responses[person]?.[0] === c.code;
                                                    return (
                                                        <button
                                                            key={c.code}
                                                            className={`px-4 py-2 rounded-lg font-semibold text-white shadow-md transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                                                                c.code === 'Blue'
                                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                                    : c.code === 'Red'
                                                                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                                        : c.code === 'Yellow'
                                                                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                                                                            : 'bg-gradient-to-r from-green-500 to-green-600'
                                                            } ${isSelected ? 'ring-4 ring-offset-2 ring-gray-800' : ''}`}
                                                            onClick={() => selectColor(person, c.code)}
                                                        >
                                                            {c.title.split(' ')[0]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Legend cards styled like a description table */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-6 text-center">Color Legend</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {legendCards.map(card => (
                                <div key={card.code} className="overflow-hidden bg-white shadow rounded-lg border border-gray-200">
                                    <div className="h-2" style={{ backgroundColor: card.hex }} />
                                    <div className="px-6 py-4">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            {/*<span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: card.hex }} />*/}
                                            {card.title}
                                        </h3>
                                        <dl className="divide-y divide-gray-200 text-sm text-gray-700">
                                            <div className="flex justify-between py-2">
                                                <dt className="font-bold">Traits</dt>
                                                <dd className="text-right ml-4">{card.traits}</dd>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <dt className="font-bold">Focus</dt>
                                                <dd className="text-right ml-4">{card.focus}</dd>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <dt className="font-bold">Strengths</dt>
                                                <dd className="text-right ml-4">{card.strengths}</dd>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <dt className="font-bold">Challenges</dt>
                                                <dd className="text-right ml-4">{card.challenges}</dd>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <dt className="font-bold">Motto</dt>
                                                <dd className="text-right ml-4 italic">{card.motto}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Results for Fredrik */}
                    {username.toLowerCase() === 'svenne' && (
                        <>
                            <div className="flex justify-center gap-4 mb-6">
                                <button
                                    className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
                                    onClick={() => setShowResultsPerson(!showResultsPerson)}
                                >
                                    {showResultsPerson ? '🙈 Hide Results by Person' : '📊 Show Results by Person'}
                                </button>
                                <button
                                    className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700"
                                    onClick={() => setShowResultsTotal(!showResultsTotal)}
                                >
                                    {showResultsTotal ? '🙈 Hide Total Composition' : '📈 Show Total Composition'}
                                </button>
                            </div>

                            {showResultsPerson && (
                                <div className="bg-white shadow-md rounded-lg p-6 mb-10">
                                    <h2 className="text-xl font-semibold mb-4 text-center">Results by Person</h2>
                                    {chartDataPerPerson.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={chartDataPerPerson}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="Blue" stackId="a" fill="#3B82F6" />
                                                <Bar dataKey="Red" stackId="a" fill="#EF4444" />
                                                <Bar dataKey="Yellow" stackId="a" fill="#FACC15" />
                                                <Bar dataKey="Green" stackId="a" fill="#22C55E" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-gray-500 text-center">No responses yet.</p>
                                    )}
                                </div>
                            )}

                            {showResultsTotal && (
                                <div className="bg-white shadow-md rounded-lg p-6 space-y-10">
                                    <div>
                                        <h2 className="text-xl font-semibold mb-4 text-center">Total Votes by Color</h2>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={totalCounts}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count">
                                                    {totalCounts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="text-center mt-8">
                                        <h2 className="text-xl font-semibold mb-2">Team Composition Summary</h2>
                                        <p className="text-lg font-medium text-gray-700">{getTeamBalanceSummary()}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
