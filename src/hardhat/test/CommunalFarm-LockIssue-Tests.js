const BigNumber = require('bignumber.js')

const MintableToken = artifacts.require("MintableToken/MintableToken")
const CommunalFarm = artifacts.require("Staking/CommunalFarm");

const fastForward = async (time) => {
  await network.provider.send("evm_increaseTime", [time])
  await network.provider.send("evm_mine")
}

contract('CommunalFarm-Tests lock multiplier issue', async (accounts) => {
  const [owner, user1, user2] = accounts
  let rewardsToken
  let stakingToken
  let communalFarm
  let rewardsDuration

  beforeEach(async() => {
    const initialAmount = new BigNumber(1000000e18)
    const rewardSymbol = 'LUSD'
    rewardsToken = await MintableToken.new('Rewards Token', rewardSymbol)
    await rewardsToken.mint(owner, initialAmount)
    stakingToken = await MintableToken.new('Staking Token', 'D4LP')
    await stakingToken.mint(user1, initialAmount)
    await stakingToken.mint(user2, initialAmount)

    const rewardRate = new BigNumber(1e18)
    communalFarm = await CommunalFarm.new(
      owner,
      stakingToken.address,
      [rewardSymbol],
      [rewardsToken.address],
      [owner],
      [rewardRate.toString()],
      owner
    )
    await communalFarm.initializeDefault()

    // fund contract
    rewardsDuration = await communalFarm.rewardsDuration()
    await rewardsToken.transfer(communalFarm.address, (new BigNumber(rewardsDuration)).times(rewardRate))
  })

  it('2 users staking and locking', async() => {
    const baseLiquidity = new BigNumber(100e18)
    const lockTimeMin = await communalFarm.lock_time_min()
    const lockTime = (new BigNumber(lockTimeMin)).times(new BigNumber(2))

    // user 1 stakes and locks
    await stakingToken.approve(communalFarm.address, baseLiquidity, { from: user1 })
    await communalFarm.stakeLocked(baseLiquidity, lockTime, { from: user1 })
    const locks1 = await communalFarm.lockedStakesOf(user1)
    //console.log(locks1)
    const kek1 = locks1[0][0]

    // user 2 stakes and locks the same
    await stakingToken.approve(communalFarm.address, baseLiquidity, { from: user2 })
    await communalFarm.stakeLocked(baseLiquidity, lockTime, { from: user2 })
    //console.log(await communalFarm.lockedStakesOf(user2))
    const locks2 = await communalFarm.lockedStakesOf(user2)
    //console.log(locks2)
    const kek2 = locks2[0][0]

    // fast-forward lockTime + 1 day, user 1 gets rewards
    //await fastForward(lockTime.plus(new BigNumber(86400)))
    await fastForward(86400 * 3)
    await communalFarm.getReward({ from: user1 })

    console.log('user 1 bal: ', (await rewardsToken.balanceOf(user1)).toString())
    console.log('user 2 bal: ', (await rewardsToken.balanceOf(user2)).toString())

    // fast-forward 1 day, both users get rewards
    await fastForward(86400)
    await communalFarm.getReward({ from: user1 })
    await communalFarm.getReward({ from: user2 })

    console.log('user 1 bal: ', (await rewardsToken.balanceOf(user1)).toString())
    console.log('user 2 bal: ', (await rewardsToken.balanceOf(user2)).toString())

    assert.equal((await rewardsToken.balanceOf(user1)).toString(), (await rewardsToken.balanceOf(user2)).toString(), 'rewards should be the same')
  })

  it('1 user staking and locking, get rewards befere period ends, withdraw after period is over', async() => {
    const baseLiquidity = new BigNumber(100e18)
    const lockTimeMin = await communalFarm.lock_time_min()
    const lockTime = (new BigNumber(lockTimeMin)).times(new BigNumber(2))

    // user 1 stakes and locks
    await stakingToken.approve(communalFarm.address, baseLiquidity, { from: user1 })
    await communalFarm.stakeLocked(baseLiquidity, lockTime, { from: user1 })
    const locks1 = await communalFarm.lockedStakesOf(user1)
    //console.log(locks1)
    const kek1 = locks1[0][0]

    // fast-forward 1 day, both users get rewards
    await fastForward(86400)
    await communalFarm.getReward({ from: user1 })

    // fast-forward reward duration, both users withdraw
    //await fastForward(lockTime.plus(rewardsDuration))
    await fastForward(604800 + 1)
    await communalFarm.withdrawLocked(kek1, { from: user1 })

    console.log('user 1 bal: ', (await rewardsToken.balanceOf(user1)).toString())
  })

  it('1 user staking and locking, withdraw after period is over', async() => {
    const baseLiquidity = new BigNumber(100e18)
    const lockTimeMin = await communalFarm.lock_time_min()
    const lockTime = (new BigNumber(lockTimeMin)).times(new BigNumber(2))

    // user 1 stakes and locks
    await stakingToken.approve(communalFarm.address, baseLiquidity, { from: user1 })
    await communalFarm.stakeLocked(baseLiquidity, lockTime, { from: user1 })
    const locks1 = await communalFarm.lockedStakesOf(user1)
    //console.log(locks1)
    const kek1 = locks1[0][0]

    // fast-forward reward duration, both users withdraw
    await fastForward(604800 + 86400)
    const tx = await communalFarm.withdrawLocked(kek1, { from: user1 })
    //console.log(tx.logs[1].args.reward.toString())

    console.log('user 1 bal: ', (await rewardsToken.balanceOf(user1)).toString())
  })
})
