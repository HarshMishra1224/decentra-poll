// App.js - Final version with full working features for DecentraPoll

import React, { useState, useEffect } from 'react'; import { ethers } from 'ethers'; import './App.css'; import PollDAppABI from './PollDAppABI.json';

const CONTRACT_ADDRESS = "0x0D7D0c9D9DcdF8E6AE70B4BCe6f7fe9de2dd9314";

function App() { const [account, setAccount] = useState(''); const [contract, setContract] = useState(null); const [polls, setPolls] = useState([]); const [leaderboard, setLeaderboard] = useState([]); const [loading, setLoading] = useState(true); const [newPollQuestion, setNewPollQuestion] = useState(''); const [newPollOptions, setNewPollOptions] = useState(['', '']);

async function connectWallet() { try { const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); const account = accounts[0]; setAccount(account);

const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);

  setContract(pollContract);
  await loadPolls(pollContract, account);
  await loadLeaderboard(pollContract);
  setLoading(false);

} catch (error) {
  console.error("Error connecting to wallet:", error);
  alert("Failed to connect to wallet.");
  setLoading(false);
}

}

const loadPolls = async (pollContract, account) => { try { const count = await pollContract.getPollCount(); const pollData = [];

for (let i = 0; i < count; i++) {
    try {
      const poll = await pollContract.getPoll(i);
      let hasUserVoted = false;
      if (account) {
        hasUserVoted = await pollContract.checkIfVoted(account, i);
      }
      if (!poll.question) continue;

      pollData.push({
        id: i,
        question: poll.question,
        options: poll.options,
        voteCounts: poll.voteCounts.map(v => v.toNumber()),
        totalVotes: poll.totalVotes.toNumber(),
        creator: poll.creator,
        hasVoted: hasUserVoted
      });
    } catch (err) {
      console.warn(`Skipping poll ${i}: ${err.message}`);
      continue;
    }
  }
  setPolls(pollData);
} catch (err) {
  console.error("Error loading polls:", err);
}

};

const loadLeaderboard = async (pollContract) => { try { const leaderboardIds = await pollContract.getLeaderboard(); const pollData = [];

for (let i = 0; i < leaderboardIds.length; i++) {
    const pollId = leaderboardIds[i].toNumber();
    try {
      const poll = await pollContract.getPoll(pollId);
      if (!poll.question) continue;

      pollData.push({
        id: pollId,
        question: poll.question,
        totalVotes: poll.totalVotes.toNumber()
      });
    } catch (err) {
      console.warn(`1Skipping leaderboard poll ${pollId}: ${err.message}`);
      continue;
    }
  }
  setLeaderboard(pollData);
} catch (err) {
  console.error("Error loading leaderboard:", err);
}

};

async function createPoll(e) { e.preventDefault(); try { const options = newPollOptions.filter(option => option.trim() !== ''); if (options.length < 2) { alert("You need at least 2 options for a poll"); return; }

setLoading(true);
  const tx = await contract.createPoll(newPollQuestion, options);
  await tx.wait();
  setNewPollQuestion('');
  setNewPollOptions(['', '']);
  await loadPolls(contract, account);
  await loadLeaderboard(contract);
  setLoading(false);

} catch (error) {
  console.error("Error creating poll:", error);
  alert("Failed to create poll.");
  setLoading(false);
}

}

async function vote(pollId, optionIndex) { try { if (!contract) return; setLoading(true); const tx = await contract.vote(pollId, optionIndex); await tx.wait(); await loadPolls(contract, account); await loadLeaderboard(contract); setLoading(false); alert("Vote cast successfully!");

} catch (error) {
  setLoading(false);
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT' && error.message.includes("already voted")) {
    alert("❌ You have already voted on this poll.");
  } else {
    alert("Failed to vote: " + (error.reason || error.message));
  }
}

}

function addOption() { setNewPollOptions([...newPollOptions, '']); }

function removeOption(index) { if (newPollOptions.length <= 2) { alert("A poll must have at least 2 options"); return; } const updated = [...newPollOptions]; updated.splice(index, 1); setNewPollOptions(updated); }

function updateOption(index, value) { const updated = [...newPollOptions]; updated[index] = value; setNewPollOptions(updated); }

useEffect(() => { if (!window.ethereum) { alert("MetaMask is not installed."); setLoading(false); return; }

const initialize = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  let userAddress;

  try {
    userAddress = await signer.getAddress();
    setAccount(userAddress);
  } catch {
    userAddress = null;
  }

  const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);
  setContract(pollContract);
  await loadPolls(pollContract, userAddress);
  await loadLeaderboard(pollContract);
  setLoading(false);
};

initialize();

window.ethereum.on('accountsChanged', async (accounts) => {
  setAccount(accounts[0]);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);
  await loadPolls(pollContract, accounts[0]);
  await loadLeaderboard(pollContract);
});

}, [loadPolls]);

return ( <div className="App"> <header className="App-header"> <h1>DeFi Poll DApp</h1> <p>Create and participate in polls on the blockchain</p> {account ? ( <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p> ) : ( <button onClick={connectWallet}>Connect Wallet</button> )} </header>

<main>
    {loading ? (
      <div className="loading">Loading...</div>
    ) : (
      <>
        <section className="create-poll">
          <h2>Create a New Poll</h2>
          <form onSubmit={createPoll}>
            <div className="form-group">
              <label>Question:</label>
              <input
                type="text"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                required
                placeholder="Enter your poll question"
              />
            </div>
            <div className="form-group">
              <label>Options:</label>
              {newPollOptions.map((option, index) => (
                <div key={index} className="option-row">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    required
                    placeholder={`Option ${index + 1}`}
                  />
                  <button type="button" onClick={() => removeOption(index)}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addOption}>Add Option</button>
            </div>
            <button type="submit">Create Poll</button>
          </form>
        </section>

        <section className="polls">
          <h2>All Polls</h2>
          {polls.length === 0 ? (
            <p>No polls yet.</p>
          ) : (
            <div className="polls-grid">
              {polls.map(poll => (
                <div key={poll.id} className="poll-card">
                  <h3>{poll.question}</h3>
                  <p>Total votes: {poll.totalVotes}</p>
                  <div className="options">
                    {poll.options.map((option, idx) => (
                      <div key={idx} className="option">
                        <div className="option-info">
                          <span>{option}</span>
                          <span>{poll.voteCounts[idx]} votes</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress"
                            style={{
                              width: poll.totalVotes > 0
                                ? `${(poll.voteCounts[idx] / poll.totalVotes) * 100}%`
                                : '0%'
                            }}
                          ></div>
                        </div>
                        {!poll.hasVoted && (
                          <button onClick={() => vote(poll.id, idx)}>Vote</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {poll.hasVoted && <p>You've already voted</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="leaderboard">
          <h2>Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p>No leaderboard yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Poll</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((poll, idx) => (
                  <tr key={poll.id}>
                    <td>{idx + 1}</td>
                    <td>{poll.question}</td>
                    <td>{poll.totalVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </>
    )}
  </main>

  <footer>
    <p>Simple DeFi Poll DApp - Created for blockchain beginners</p>
  </footer>
</div>

); }

export default App;